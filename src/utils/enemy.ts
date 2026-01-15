import k from '../lib/kaplay'
import type { GameObj} from "kaplay";
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
    anchor,
    body,
    // getData,
    get,
    health,
    layer,
    pos,
    Rect,
    // rotate,
    // setData,
    state,
    sprite,
    vec2
} = k

const chaseOrNot = (enemy: GameObj, sizeWithPadding: number) => {
    const players = getPlayers()
    // console.log('players', players)

    let result = false

    if(players.length){
        players.forEach(player => {
            const distance = enemy.pos.dist(player.pos)

            console.log('distance', distance)

            if(distance < 200){
                enemy.enterState('chase', player)
                result = true
            }else{
                result = false
            }
        })
    }else{
        result = false
    }

    return result
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
                newX = currentPos.x + ((distanceToTiles - i) * tileWidth)
                newY = currentPos.y + ((i - distanceToTiles) * tileWidth)
            }else{
                newX = currentPos.x + ((j - 1)  * tileWidth)
                newY = currentPos.y - ((distanceToTiles - j) * tileWidth)
            }

            if(level[0][newY] && level[0][newY][newX] !== undefined && level[0][newY][newX] === 0){
                tilesInRange.push({ x: newX, y: newY })
            }
        }
    }

    const randomPos = Math.floor(Math.random() * tilesInRange.length - 1)
    const destination = {
        pos: vec2(
        tilesInRange[randomPos].x + (sizeWithPadding / 2),
        tilesInRange[randomPos].y + (sizeWithPadding / 2)
    )
    }
    enemy.enterState('chase', destination)
}

export const spawnEnemiesForRoom = (room: roomNode) => {
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

            const enemy = map.add([
                sprite('enemy'),
                health(10, 10),
                anchor('center'),
                area({ shape: new Rect(vec2(0), map.tileWidth, map.tileWidth) }),
                body({ isStatic: true }),
                layer('game'),
                pos(spawn.x, spawn.y),
                state('idle', ['idle', 'attack', 'move', 'chase']),
                {
                    //predefined data
                    roomId: room.id,
                    defeat: e.defeat,
                    active: !e.active,
                    path: [],
                    speed: 100,
                    direction: 'left',
                    spawn,
                    chunk,
                },
                // tags
                "enemy"
            ])

            // enemy.onStateEnter('idle', () => {
            //     // Check distance between the enemy and player
            //     chaseOrNot(enemy, sizeWithPadding)
            // })

            enemy.onStateUpdate('idle', () => {
                // Check distance between the enemy and player
                const chase = chaseOrNot(enemy, sizeWithPadding)

                if(!chase){
                    // Decide to patrol or not
                    stayOrNot(enemy, sizeWithPadding)
                }
            })

            enemy.onStateEnter('move', (obj) => {
                console.log('move to', obj)
                
                enemy.moveTo(obj.pos)
                enemy.play('walk')
            })

            enemy.onStateUpdate('move', () => {    
                chaseOrNot(enemy, sizeWithPadding)
            })

            enemy.onStateEnter('chase', (obj) => {
                console.log('chase to', obj)
                
                enemy.moveTo(obj.pos)
                enemy.play('walk')
            })            

            enemy.onStateUpdate('chase', () => {
                const players = getPlayers()
                // console.log('players', players)
                players.forEach(player => {
                    const distance = enemy.pos.dist(player.pos)

                    console.log('distance', distance)

                    if(distance < 10){
                        enemy.enterState('attack', player)
                    }
                })
            })

            enemy.onStateEnter('attack', (player) => {
                console.log('attack player', player)
                const currentAnim = enemy.getCurAnim()

                if(currentAnim?.name === 'attack') return 

                enemy.play('attack', {
                    onEnd: () => {
                        enemy.frame = 0
                        // And more
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
                        if(!enemy.get('attack').length && currentAnim.frameIndex === 3) createHitBox(enemy, enemy.direction, currentAnim, [ 'enemy', 'pot', 'chest']) 
                    break;
                    case 'walk':{
                        // Update direction
                        const { x, y } = enemy.vel 

                        if(x < 0){
                            enemy.direction = 'left'
                        }

                        if(x > 0){
                            enemy.direction = 'right'
                        }

                        if(y < 0){
                            enemy.direction = 'top'
                        }

                        if(y > 0){
                            enemy.direction = 'down'
                        }
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