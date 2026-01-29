import k from '../lib/kaplay'
import type { GameObj } from "kaplay";
import type { roomNode } from '../model/map'

import { setCameraPosition } from './camera';
import { createHitBox } from './hitBox'
import { getGameStoreValue } from '../store/game';
import { RoomState } from '../model/map'
// import { getOptionValue } from '../store/setting';
import { spawnEnemiesForRoom } from './enemy';
import playerData from '../data/player.json'
import { setUIElements } from './UI';

const {
    add,
    area,
    anchor,
    body,
    getData,
    get,
    health,
    isKeyDown,
    layer,
    pos,
    Rect,
    // rotate,
    setData,
    // state,
    sprite,
    text,
    vec2,
    wait
} = k

const GROWTH = [0, 1, 3]

// Utils
const onEnterRoom = (room: roomNode) => {
    // console.log('room enter', room)
    if (room.state !== RoomState.Unvisited) return;

    room.state = RoomState.Active;

    spawnEnemiesForRoom(room);
}

export const getPlayers = () => {
    return get('player')
}

export const createPlayerSprite = (map: GameObj, x: number, y: number, mapWidth: number, mapHeight: number, data: typeof playerData | null = null) => {
    if(!data) data = playerData
    const sizeWithPadding = map.tileWidth + 10 // 5px for padding on each side
    const player = add([
        sprite("player"), 
        anchor('center'),
        area({ shape: new Rect(vec2(0), map.tileWidth, map.tileWidth) }),
        body(),
        layer('game'),
        health(data.attribute.hp, data.max.hp),
        pos((x * map.tileWidth) + (sizeWithPadding / 2), (y * map.tileWidth) + (sizeWithPadding / 2)),
        {
            direction: 'left',
            ...data,
            gainExp: (exp: number) => {
                player.exp += player.lv === player.max.level? player.max.exp : exp
                // Check if player need to levelup
                player.levelUp()
            },
            levelUp: () => {
                if(player.exp >= player.max.exp && player.lv < player.max.level){
                    // Level up
                    player.lv += 1
                    player.pt += 3

                    // Random growth
                    Object.entries(player.attribute).forEach(attr => {
                        const rng = Math.floor(Math.random() * (GROWTH.length - 1))
                        switch(attr[0]){
                            case 'hp':
                                player.max.hp += GROWTH[rng]
                            break;
                            case 'mp':
                                player.max.mp += GROWTH[rng]
                            break;
                            default:
                                attr[1] += GROWTH[rng]
                            break;
                        }
                    })

                    // Increase required exp for next lv
                    player.max.exp += player.max.exp * 1.5 
                    // Incase if exp is much higer
                    player.levelUp() 
                }                
            }
        },
        // tags
        "player"
    ]);

    player.add([
        text('', {
            size: 10,
            transform: {
                scale: 1
            } 
        }),
        pos(0, -map.tileWidth),
        'text'
    ])

    console.log('player', player)
    setCameraPosition(player, mapWidth, mapHeight)

    player.onCollideUpdate('enemy', (enemy: GameObj) => {
        const enemyAnim = enemy.getCurAnim()
        
        enemy.isStatic = enemy.state === 'attack'

        if(enemyAnim?.name === 'walk'){
            player.secondary.move_speed = 75
        }
    })

    player.onCollideEnd('enemy', (enemy: GameObj) => {
        enemy.isStatic = false
        player.isStatic = false
        player.secondary.move_speed = 100
    })    

    player.onHurt(() => {
        player.play('hurt')
        setData('ready', false)
        wait(0.1, () => setData('ready', true))
    })

    player.onDeath(() => {
        player.play('lose')
        setData('ready', false)

        // And more...
    })

    // #region Player control
    player.onUpdate(() => {
        if(!getData('ready', false)) return

        const currentAnim = player.getCurAnim()

        // console.log(currentAnim)

        if(!isKeyDown() && currentAnim?.name === 'walk'){
            player.stop()
            player.frame = 0
        }

        switch(currentAnim?.name){
            case 'attack':
                if(currentAnim.frameIndex === 2){
                    // Check if hitbox created
                    const hitBoxes = player.get('hitBox')?.find(hitbox => hitbox.anim === 'attack')

                    if(hitBoxes) return

                    createHitBox(
                        player, 
                        player.direction,
                        currentAnim, 
                        'collide', 
                        ['player', 'item']
                    )
                }       
            break;
            default: {
                // Reference: https://jslegenddev.substack.com/p/how-to-fix-diagonal-movement-in-2d
                const diagonalFactor = vec2(0, 0)

                if (isKeyDown("left")){
                    player.direction = 'left'
                    setCameraPosition(player, mapWidth, mapHeight)
                    if(currentAnim?.name !== 'walk') player.play("walk")
                    player.flipX = false
                    diagonalFactor.x = -1
                }
                
                if (isKeyDown("right")){
                    player.direction = 'right'
                    setCameraPosition(player, mapWidth, mapHeight)
                    if(currentAnim?.name !== 'walk') player.play("walk")
                    player.flipX = true
                    diagonalFactor.x = 1
                }        

                if (isKeyDown("up")){
                    player.direction = 'top'
                    setCameraPosition(player, mapWidth, mapHeight)
                    if(currentAnim?.name !== 'walk') player.play("walk")
                    diagonalFactor.y = -1
                }     
                
                if (isKeyDown("down")){
                    player.direction = 'down'
                    setCameraPosition(player, mapWidth, mapHeight)
                    if(currentAnim?.name !== 'walk') player.play("walk")
                    diagonalFactor.y = 1
                }     

                const unitVector = diagonalFactor.unit()
                player.move(unitVector.scale(player.secondary.move_speed))

                // Get current room
                const { roomNodes } = getGameStoreValue()
                const playerPos = { x: Math.floor(player.pos.x / map.tileWidth), y: Math.floor(player.pos.y / map.tileWidth) }
                const room = roomNodes.find(room => {
                    return playerPos.x >= room.x && playerPos.x <= (room.x + room.w - 1) && playerPos.y >= room.y && playerPos.y <= (room.y + room.h - 1)
                })

                if(room) onEnterRoom(room)

                if (isKeyDown('z')){
                    if(currentAnim?.name !== 'attack') {
                        player.play("attack", {
                            onEnd: () => {
                                player.frame = 0
                                console.log('animation end')
                                // Destroy hitBoxes
                                const hitBoxes = player.get('hitBox')
                                hitBoxes.forEach(hitBox => {
                                    if(hitBox.anim === 'attack')
                                        hitBox.destroy()
                                })
                            }
                        })
                    }
                }                
            }
            break;
        }        
    })  

    setUIElements(player, map)
    // #endregion  
}
