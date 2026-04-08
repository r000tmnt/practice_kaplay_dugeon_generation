import k from '../lib/kaplay'
import type { GameObj } from "kaplay";
import type { prop, roomNode } from '../model/map'

import { createHitBox } from './hitBox'
import { gameStore, getGameStoreValue, enemyAtom } from '../store/game';
import { getOptionValue } from '../store/setting';
import { getPlayers } from './player'
import enemyData from '../data/enemy.json'
import { prepareItemsToDrop } from './item';
import { 
    setDirection, 
    getPathAndFollow,
    steering
} from './pathFinding';
// import { displayTargetBar } from '../components/UI' 

const GROWTH = [0, 1, 3]

const {
    area,
    add,
    anchor,
    body,
    // getData,
    // get,
    health,
    layer,
    // opacity,
    offscreen,
    patrol,
    pathfinder,
    pos,
    Rect,
    RNG,
    // rgb,
    // rotate,
    setData,
    state,
    sentry,
    sprite,
    // text,
    vec2,
    wait,
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

const stayOrNot = (enemy: GameObj) => {
    const { level } = getGameStoreValue()
    const { tileWidth } = getOptionValue()

    const stay = Math.random() < 0.5

    if(stay) return        
    
    // Pick a tile in range as destination
    const distanceToTiles = Math.floor(200/tileWidth)
    const tilesInRange: { x: number, y: number }[] = []

    const most = (distanceToTiles * 2) + 1

    const currentPos = {
        x: enemy.pos.x - (tileWidth / 2),
        y: enemy.pos.y - (tileWidth / 2)
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
    // console.log('tilesInRange', tilesInRange)
    if(tilesInRange.length && enemy.state !== 'chase'){
        const randomPos = Math.floor(Math.random() * (tilesInRange.length - 1))

        if(tilesInRange[randomPos] === undefined){
            enemy.enterState('idle')   
            return
        }

        const destination = {
            pos: vec2(
                tilesInRange[randomPos].x + (tileWidth / 2),
                tilesInRange[randomPos].y + (tileWidth / 2)
            )
        }
        enemy.enterState('move', destination)        
    }else{
        if(enemy.state !== 'chase') enemy.enterState('idle')   
    }
}

export const spawnEnemiesForRoom = async(room: roomNode, data: typeof enemyData | null = null) => {
    if(!data) data = JSON.parse(JSON.stringify(enemyData))
    const { enemies, level, danger } = getGameStoreValue()
    const { tileWidth } = getOptionValue()
    const count = enemies.filter((e: prop) => {
        if(e.roomId === room.id && !e.defeat){
            return e
        }
    })

    // Alter enemy attributes based on danger level 
    for(let i=0; i < danger; i++){
        console.log('times', i)
        if(data){
            data.lv += 1
            Object.entries(data.attribute).forEach(([key, value]) => {
                data.attribute[key as keyof { hp: number, mp: number, physique: number, mentality: number, agility: number }] = value + GROWTH[Math.floor(Math.random() * GROWTH.length)]
                console.log(key, data.attribute[key as keyof { hp: number, mp: number, physique: number, mentality: number, agility: number }])

                if(key === 'hp' || key === 'mp') data.max[key] = data.attribute[key as keyof { hp: number, mp: number, physique: number, mentality: number, agility: number }]
            })            
        }
    }

    // if(danger % 4 === 0){
    //     // BOSS TIME

    // }

    // Check if spawned
    // const map = get('map')[0]
    // const sizeWithPadding = map.tileWidth + 10 // 5px for padding on each side

    if(count.length && data){
        const { nav } = await import('../utils/bspDungeonGenerator');
        // console.log('nav in enemy', nav)
        count.forEach((e: prop, i: number) => {
            // console.log('spawn enemy')

            const spawn = {
                x: (e.x * tileWidth) + (tileWidth / 2),
                y: (e.y * tileWidth) + (tileWidth / 2)
            }

            const enemy = add([
                sprite('enemy'),
                health(data.attribute.hp, data.max.hp),
                anchor('center'),
                area({ shape: new Rect(vec2(0), tileWidth, tileWidth), collisionIgnore: ["item"] }),
                body(),
                layer('game'),
                // offscreen({ hide: true }),
                pos(spawn.x, spawn.y),
                state('idle', ['idle', 'attack', 'move', 'chase', 'pause']),
                // Sentry makes it easy to check for visibility of the player
                sentry(
                    { 
                        include: ["player", "pot", "chest", "shrine"], // Tags to check
                        includeOp: 'or' // Rule to checking tags (and/or)
                    }, 
                    {
                        lineOfSight: true,
                        raycastExclude: ["enemy"],
                    }
                ),                
                // Patrol can make the enemy follow a computed path
                patrol({ speed: data.secondary.move_speed }),                
                pathfinder({ graph: nav }),
                {
                    //predefined data
                    roomId: room.id,
                    defeat: e.defeat,
                    active: !e.active,
                    facing: 'left',
                    path: [],
                    index: `${room.id}_${i}`,
                    spawn: {
                        x: e.x,
                        y: e.y
                    },
                    ...data,
                    exp: Math.floor(
                        Object.values(data.attribute).reduce((prev, curr) => curr + prev, 0) / Object.entries(data.attribute).length
                    ),
                    clearHitBox: (anim: string) => {
                        const hitBoxes = enemy.get('hitBox')

                        hitBoxes.forEach(hitBox => {
                            if(hitBox.anim === anim)
                                hitBox.destroy()
                        })
                    },
                    checkDistanceToPlayer: (player: GameObj) => {
                        if(enemy.defeat || enemy.state === 'pause') return
                        const distance = enemy.pos.dist(player.pos)

                        console.log('distance', distance)

                        if(distance < 50){
                            console.log('enter by checkDistanceToPlayer')
                            enemy.enterState('attack', player)
                        }else
                        if(distance < 200){
                            enemy.enterState('chase', player)
                        }else{
                            enemy.enterState('idle')
                        }
                    },
                    steering: (ObjectInSight: GameObj) => steering(enemy, ObjectInSight, tileWidth, level)
                },
                // tags
                "enemy"
            ])

            console.log('spawned enemy', enemy)

            enemy.onObjectsSpotted((objs) => {
                if(enemy.defeat || enemy.state === 'pause') return

                const playerInSight = objs.find(o => o.is('player'))
                const ObjectInSight = objs.find(o => o.is('pot') || o.is('chest'))

                if(playerInSight && enemy.state !== 'attack'){
                    // console.log('playerInSight', playerInSight)
                    const chase = chaseOrNot(enemy, playerInSight)

                    if(!chase){
                        enemy.enterState('idle')
                    }
                    // if(chase && enemy.waypoints?.length) enemy.waypoints?.splice(0)
                }else
                // If object is in the way
                if(ObjectInSight && enemy.waypoints?.length){
                    console.log('ObjectInSight', ObjectInSight)
                    enemy.steering(ObjectInSight)
                }
            })

            enemy.onPatrolFinished(()=> {
                if(enemy.defeat || enemy.state === 'pause') return
                if(enemy.path?.length) {
                    enemy.waypoints = [enemy.path[0]]
                    enemy.path.splice(0, 1)
                }else{
                    console.log('patrol finished')
                    if(enemy.state === 'chase' || enemy.state === 'attack') return
                    enemy.stop()
                    enemy.frame = 0                    
                    wait(Math.random(), () => {
                        if(enemy.state === 'chase' || enemy.state === 'attack') return
                        enemy.enterState('idle')
                    })
                }
            })

            enemy.onStateUpdate('idle', () => {
                stayOrNot(enemy)
            })

            enemy.onStateEnter('move', (obj) => {
                if(enemy.defeat) return
                // console.log('move to', obj)
                getPathAndFollow(enemy, obj.pos)
            })

            enemy.onStateEnter('chase', (obj) => {
                if(enemy.defeat) return
                // console.log('chase to', obj)
                getPathAndFollow(enemy, obj.pos)
            })            

            enemy.onStateUpdate('chase', () => {
                if(enemy.defeat) return
                const curAnim = enemy.getCurAnim()

                if(curAnim?.name === 'hurt') return

                const player = getPlayers()[0]
                // // console.log('players', players)
                // players.forEach(player => {
                const distance = enemy.pos.dist(player.pos)

                // console.log('distance', distance)

                if(distance < 50){
                    enemy.waypoints?.splice(0)
                    // Direction to player
                    setDirection(enemy, player.pos)
                    // console.log('enter from chase')
                    if(enemy.hp > 0) enemy.enterState('attack', player)
                }
                
                // If player is out of range, go for the last known position
                if(distance > 200){
                    getPathAndFollow(enemy, player.pos)
                }
            })

            enemy.onStateEnter('attack', (player) => {
                console.log('attack player', player)
                const currentAnim = enemy.getCurAnim()

                if(currentAnim?.name === 'attack') return 

                enemy.play('attack', {
                    onEnd: () => {
                        console.log('enemy attack animation ended', enemy.hp)
                        if(enemy.hp <= 0 || enemy.state === 'pause') return

                        enemy.frame = 0

                        // Destroy hitBoxes
                        enemy.clearHitBox('attack')

                        // And more
                        wait(0.1, () => enemy.checkDistanceToPlayer(player))
                    }
                })
            })      
            
            enemy.onStateEnter('pause', () => {
                // console.log('enter pause')
                enemy.waypoints?.splice(0)
                enemy.stop()
                enemy.frame = 0
                enemy.hidden = true
            })

            enemy.onHurt(() => {
                enemy.play('hurt', {
                    onEnd: () => {
                        // console.log('enemy hp', enemy.hp)
                        if(enemy.state === 'attack'){
                            enemy.clearHitBox('attack')
                            wait(0.2, () => enemy.checkDistanceToPlayer(getPlayers()[0]))
                        }
                    }
                })                 
            })

            enemy.onUnuse((id: string) => {
                console.log('enemy un use component', id)
                console.log(enemy)

                // TODO: Count down to respawn
                wait(30, () => {
                    // const { enemies } = getGameStoreValue()
                    // const eIndex = enemies.findIndex(prop => prop.x === enemy.spawn.x && prop.y === enemy.spawn.y)
                    // enemies[eIndex].defeat = false
                    // enemies[eIndex].active = true
                    // gameStore.set(enemyAtom, enemies)  
                    // Fill up hp & mp
                    enemy.hp = enemy.max.hp
                    enemy.attribute.hp = enemy.max.hp
                    enemy.attribute.mp = enemy.max.mp                            
                    enemy.frame = 0
                    enemy.defeat = false
                    enemy.hidden = false
                    
                    enemy.use(body())
                    // enemy.use(patrol({ speed: data.secondary.move_speed }))
                    // enemy.use(pathfinder({ graph: nav }))                            
                    enemy.enterState('idle')
                })                
            })

            enemy.onDeath(() => {
                console.log('enter onDeath')
                localStorage.removeItem('targeting')
                enemy.defeat = true
                // enemy.unuse('patrol')
                // enemy.unuse('pathfinder')
                enemy.clearHitBox('attack')
                enemy.unuse('body')
                // console.log('enemy un-body', enemy)
                // if(enemy.isStatic !== undefined) delete (enemy as any).isStatic
                enemy.play('lose', {
                    onEnd: () => {
                        console.log('enemy lose animation ended')

                        // const { enemies } = getGameStoreValue()

                        // Update props
                        // const eIndex = enemies.findIndex(prop => prop.x === enemy.spawn.x && prop.y === enemy.spawn.y)

                        // enemies[eIndex].defeat = true
                        // enemies[eIndex].active = false
                        // enemies[eIndex].x = enemy.pos.x - (tileWidth / 2)
                        // enemies[eIndex].y = enemy.pos.y - (tileWidth / 2)
                        // enemies[eIndex].flipX = enemy.flipX

                        // gameStore.set(enemyAtom, enemies)   

                        enemy.hidden = true
                        // enemy.destroy()

                        // Player gain exp
                        getPlayers()[0].gainExp(enemy)

                        // Drop item
                        const rng = new RNG(Date.now())
                        const rate = rng.gen() + danger                        
                        const base = {
                            count: {
                                min: 1,
                                max: rng.genNumber(1, Math.floor(3 * rate))
                            },
                            item: {
                                gold: 0.5,
                                head: 0.2,
                                hand: 0.2,
                                body: 0.2,
                                feet: 0.2,
                                accessory: 0.2,
                                potion: 0.2,
                                card: 0.1,
                                other: 0.2
                            },
                            gold: {
                                min: 1,
                                max: rng.genNumber(1, Math.floor(5 * rate))
                            }
                        }

                        prepareItemsToDrop(enemy, base)
                    }
                })
                // console.log('enemy dead')
            })

            enemy.onCollideUpdate('player', (player: GameObj) => {
                if(player.getCurAnim()?.name === 'attack'){
                    player.isStatic = true
                }
            })

            enemy.onCollideEnd('player', (player: GameObj) => {
                player.isStatic = false
            })    

            enemy.onUpdate(() => {
                const currentAnim = enemy.getCurAnim()

                switch(currentAnim?.name){
                    case 'attack':{
                        const hitBox = enemy.get('hitBox')
                        
                        if(!hitBox.find(box => box.anim === 'attack') && currentAnim.frameIndex === 3) 
                            createHitBox(
                                enemy, 
                                enemy.facing,
                                currentAnim, 
                                'collide', 
                                ['enemy', 'pot', 'chest', 'shrine', 'item']
                            )                         
                    }
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

            enemy.onHoverUpdate(() => {
                if(enemy.defeat) return
                setData('targeting', JSON.stringify({
                    lv: enemy.lv,
                    name: enemy.name,
                    current: enemy.hp,
                    max: enemy.max.hp
                }))
                // displayTargetBar(enemy, k.width() / 4, k.height() / 20, tileWidth)
            })

            enemy.onHoverEnd(() => {
                localStorage.removeItem('targeting')
            })
        })
    }
}