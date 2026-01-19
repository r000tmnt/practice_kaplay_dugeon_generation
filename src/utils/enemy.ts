import k from '../lib/kaplay'
import type { GameObj, Vec2 } from "kaplay";
import type { prop, roomNode } from '../model/map'

import { createHitBox } from './hitBox'
import { gameState, gameStore, getGameStoreValue } from '../store/game';
// import { RoomState } from '../model/map'
import { getOptionValue } from '../store/setting';
import { getPlayers } from './player'

// Store
// import { createStore } from 'jotai'
// import { setting } from '../store/setting';
// const store = createStore()

const {
    area,
    add,
    anchor,
    body,
    // getData,
    get,
    health,
    layer,
    patrol,
    pathfinder,
    pos,
    Rect,
    // rotate,
    // setData,
    state,
    sentry,
    sprite,
    vec2
} = k

const chaseOrNot = (enemy: GameObj, player: GameObj) => {
    const distance = enemy.pos.dist(player.pos)

    // console.log('distance', distance)

    if(distance < 200){
        enemy.enterState('chase', player)
        return true
    }else{
        return false
    }
}

const stayOrNot = (enemy: GameObj, sizeWithPadding: number) => {
    const { level } = getGameStoreValue()
    const { tileWidth } = getOptionValue()

    const stay = Math.random() < 0.5

    if(stay) return        
    
    // Pick a tile in range as destination
    const distanceToTiles = Math.floor(200/tileWidth)
    const tilesInRange: { x: number, y: number }[] = []

    const most = (distanceToTiles * 2) + 1

    const currentPos = {
        x: enemy.pos.x - (sizeWithPadding / 2),
        y: enemy.pos.y - (sizeWithPadding / 2)
    }

    let newX=0, newY=0

    for(let i=0; i < most; i++){
        const block = i <= distanceToTiles?  2 * i : most - (2 * (i - distanceToTiles))

        for(let j=0; j < block; j ++){
            if(block < most && i > distanceToTiles){
                newX = Math.floor((currentPos.x + ((distanceToTiles - i) * tileWidth)) / tileWidth)
                newY = Math.floor((currentPos.y + ((i - distanceToTiles) * tileWidth)) / tileWidth)
            }else{
                newX = Math.floor((currentPos.x + ((j - 1)  * tileWidth)) / tileWidth)
                newY = Math.floor((currentPos.y - ((distanceToTiles - j) * tileWidth)) / tileWidth)
            }

            // console.log('checking tile', newX, newY)

            if(level[newY] && level[newY][newX] !== undefined && level[newY][newX] === 0){
                // console.log('add vialble tiles')
                tilesInRange.push({ x: newX * tileWidth, y: newY * tileWidth } )
            }
        }
    }
    console.log('tilesInRange', tilesInRange)
    if(tilesInRange.length){
        const randomPos = Math.floor(Math.random() * (tilesInRange.length - 1))

        if(tilesInRange[randomPos] === undefined){
            enemy.enterState('idle')   
            return
        }

        const destination = {
            pos: vec2(
                tilesInRange[randomPos].x + (sizeWithPadding / 2),
                tilesInRange[randomPos].y + (sizeWithPadding / 2)
            )
        }
        enemy.enterState('move', destination)        
    }else{
        enemy.enterState('idle')   
    }
}

const getPathAndFollow = (enemy: GameObj, destination: Vec2) => {
    try {
        // Get path
        enemy.path = enemy.navigateTo(destination)
        if(enemy.path?.length) {
            enemy.waypoints = [enemy.path[0]]
            const currentPos = enemy.pos
            console.log('waypoints', enemy.waypoints) 
            console.log('enemy.pos', currentPos) 
            enemy.path.splice(0, 1)
            // Get direction relative to enemy position
            const dist = {
                x: enemy.path[0].x - currentPos.x,
                y: enemy.path[0].y - currentPos.y
            }

            enemy.flipX = dist.x > 0
            console.log('dist', dist)
            enemy.play('walk')        
        }           
    } catch (error) {
        console.warn('pathfinding error', error)
    }
}

export const spawnEnemiesForRoom = async(room: roomNode) => {
    const { enemies } = getGameStoreValue()
    const { chunkSize } = getOptionValue()
    const copy : prop[] = JSON.parse(JSON.stringify(enemies))
    const index: number[] = []
    const count = copy.filter((e: prop, i: number) => {
        if(e.roomId === room.id && !e.defeat){
            index.push(i)
            return e
        }
    })

    // Check if spawned
    const map = get('map')[0]
    const sizeWithPadding = map.tileWidth + 10 // 5px for padding on each side

    if(count.length){
        const { nav } = await import('../utils/bspDungeonGenerator');
        console.log('nav in enemy', nav)
        count.forEach((e: prop, i: number) => {
            console.log('spawn enemy')

            // Get chunk position
            const chunk = {
                x: Math.floor(e.x / chunkSize ),
                y: Math.floor(e.y / chunkSize )
            }            

            const spawn = {
                x: e.x * map.tileWidth  + (sizeWithPadding / 2),
                y: e.y * map.tileWidth  + (sizeWithPadding / 2)
            }

            const enemy = add([
                sprite('enemy'),
                health(10, 10),
                anchor('center'),
                area({ shape: new Rect(vec2(0), map.tileWidth, map.tileWidth) }),
                body(),
                layer('game'),
                pos(spawn.x, spawn.y),
                state('idle', ['idle', 'attack', 'move', 'chase']),
                // Sentry makes it easy to check for visibility of the player
                sentry({ include: "player" }, {
                    lineOfSight: true,
                    raycastExclude: ["enemy"],
                }),                
                // Patrol can make the enemy follow a computed path
                patrol({ speed: 75 }),                
                pathfinder({
                    graph: nav,
                }),
                {
                    //predefined data
                    roomId: room.id,
                    defeat: e.defeat,
                    active: !e.active,
                    path: [],
                    speed: 75,
                    spawn,
                    chunk,
                },
                // tags
                "enemy"
            ])

            enemy.onObjectsSpotted((objs) => {
                const playerInSight = objs.find(o => o.is('player'))

                if(playerInSight){
                    const chase = chaseOrNot(enemy, playerInSight)

                    if(!chase){
                        enemy.enterState('idle')
                    }
                    // if(chase && enemy.waypoints?.length) enemy.waypoints?.splice(0)
                }
            })

            enemy.onPatrolFinished(()=> {
                if(enemy.path?.length) {
                    enemy.waypoints = [enemy.path[0]]
                    enemy.path.splice(0, 1)
                }
            })

            enemy.onStateUpdate('idle', () => {
                stayOrNot(enemy, sizeWithPadding)
            })

            enemy.onStateEnter('move', (obj) => {
                console.log('move to', obj)
                getPathAndFollow(enemy, obj.pos)
            })

            enemy.onStateEnter('chase', (obj) => {
                console.log('chase to', obj)
                getPathAndFollow(enemy, obj.pos)
            })            

            enemy.onStateUpdate('chase', () => {
                const player = getPlayers()[0]
                // // console.log('players', players)
                // players.forEach(player => {
                const distance = enemy.pos.dist(player.pos)

                // console.log('distance', distance)

                if(distance < 50){
                    enemy.enterState('attack', player)
                }else{
                    // const dir = player.pos.sub(enemy.pos).unit();
                    // enemy.move(dir.scale(enemy.speed));
                }
                // })
            })

            enemy.onStateEnter('attack', (player) => {
                console.log('attack player', player)
                const currentAnim = enemy.getCurAnim()

                if(currentAnim?.name === 'attack') return 

                enemy.play('attack', {
                    onEnd: () => {
                        enemy.frame = 0
                        // And more
                        const distance = enemy.pos.dist(player.pos)

                        console.log('distance', distance)

                        if(distance < 10){
                            enemy.enterState('attack', player)
                        }else{
                            enemy.enterState('idle')
                        }
                    }
                })
            })            

            enemy.onDeath(() => {
                console.log('enemy dead')
                console.log(enemy.getCurAnim())
                // enemy.unuse('area')
                // enemy.unuse('body')                

                // Update props
                const eIndex = enemies.findIndex(prop => prop.type === 'enemy' && prop.x === e.x && prop.y === e.y)
                enemies[eIndex].defeat = true
                enemies[eIndex].active = false

                gameStore.set(gameState, prve => ({
                    ...prve,
                    enemies: [
                        ...prve.enemies,
                        { ...enemies[eIndex] }
                    ]
                }))
                // Drop items         

                // And more                
            })

            enemy.onUpdate(() => {
                const currentAnim = enemy.getCurAnim()

                switch(currentAnim?.name){
                    case 'attack':
                        if(!enemy.get('attack').length && currentAnim.frameIndex === 3) createHitBox(enemy, 'left', currentAnim, [ 'enemy', 'pot', 'chest']) 
                    break;
                    case 'walk':{
                        // Update direction
                        // const { x, y } = enemy.vel 
                        // console.log('enemy facing direction' ,enemy.direction)
                        // console.log('enemy facing angle' ,enemy.directionAngle)
                        // console.log('enemy vel' ,enemy.vel)
                        // if(x < 0){
                        //     enemy.direction = 'left'
                        //     enemy.flipX = false
                        // }

                        // if(x > 0){
                        //     enemy.direction = 'right'
                        //     enemy.flipX = true
                        // }

                        // if(y < 0){
                        //     enemy.direction = 'top'
                        // }

                        // if(y > 0){
                        //     enemy.direction = 'down'
                        // }
                    }
                    break;
                }
            })

            // Remove enemies in game store   
            copy.splice(i, 1)
        })     
        
        gameStore.set(gameState, prev => ({
            ...prev,
            enemies: copy
        }))
    }
}