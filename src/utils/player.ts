import k from '../lib/kaplay'
import type { GameObj } from "kaplay";
import type { roomNode } from '../model/map'

import { setCameraPosition } from './camera';
import { createHitBox } from './hitBox'
import { gameStore, getGameStoreValue, inventoryUI } from '../store/game';
import { RoomState } from '../model/map'
// import { getOptionValue } from '../store/setting';
import { spawnEnemiesForRoom } from './enemy';
import playerData from '../data/player.json'
import { setUIElements, setInventoryUI } from './UI';
import { getOptionValue } from '../store/setting';
import { 
    setDirection, 
    steering 
} from './pathFinding'; 

const {
    add,
    area,
    anchor,
    body,
    getData,
    get,
    health,
    isKeyDown,
    isMousePressed,
    layer,
    // onKeyRelease,
    pathfinder,
    patrol,
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

export const createPlayerSprite = async(map: GameObj, x: number, y: number, mapWidth: number, mapHeight: number, data: typeof playerData | null = null) => {
    if(!data) data = playerData
    const { nav } = await import('../utils/bspDungeonGenerator');
    const sizeWithPadding = map.tileWidth + 10 // 5px for padding on each side
    const player = add([
        sprite("player"), 
        anchor('center'),
        area({ shape: new Rect(vec2(0), map.tileWidth, map.tileWidth) }),
        body(),
        layer('game'),
        health(data.attribute.hp, data.max.hp),
        patrol({ speed: data.secondary.move_speed }),   
        pathfinder({
            graph: nav
        }),
        pos((x * map.tileWidth) + (sizeWithPadding / 2), (y * map.tileWidth) + (sizeWithPadding / 2)),
        {
            facing: 'left',
            path: [],
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

    player.onCollide((obj: GameObj) => {
        // If player is moving alone side the path
        if(player.waypoints?.length){
          if(obj.is('pot') || obj.is('chest') || obj.is('shrine')){
            const { tileWidth } = getOptionValue()
            const { level } = getGameStoreValue()
            steering(player, obj, tileWidth, level)
          }
        }
    })

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
                        player.facing,
                        currentAnim, 
                        'collide', 
                        ['player', 'item']
                    )
                }       
            break;
            default: {
                // Reference: https://jslegenddev.substack.com/p/how-to-fix-diagonal-movement-in-2d
                const diagonalFactor = vec2(0, 0)

                if (isKeyDown("a")){
                    player.facing = 'left'
                    setCameraPosition(player, mapWidth, mapHeight)
                    if(currentAnim?.name !== 'walk') player.play("walk")
                    player.flipX = false
                    diagonalFactor.x = -1
                }
                
                if (isKeyDown("d")){
                    player.facing = 'right'
                    setCameraPosition(player, mapWidth, mapHeight)
                    if(currentAnim?.name !== 'walk') player.play("walk")
                    player.flipX = true
                    diagonalFactor.x = 1
                }        

                if (isKeyDown("w")){
                    player.facing = 'top'
                    setCameraPosition(player, mapWidth, mapHeight)
                    if(currentAnim?.name !== 'walk') player.play("walk")
                    diagonalFactor.y = -1
                }     
                
                if (isKeyDown("s")){
                    player.facing = 'down'
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

                if (isKeyDown('z') || isMousePressed('left')){
                    const { inventory } = getGameStoreValue()
                    if(currentAnim?.name !== 'attack' && !inventory.open) {
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

    player.onKeyRelease('i', async(key) => {
        if(getData('ready') !== false){
            console.log('release key', key)
            const { inventory } = getGameStoreValue()
            const { tileWidth } = getOptionValue()
            if(!inventory.inProgress){
                inventory.open = !inventory.open
                inventory.inProgress = !inventory.inProgress
                gameStore.set(inventoryUI, inventory)

                await setInventoryUI(player, map, tileWidth, inventory.open).then(() => {
                    inventory.inProgress = false
                    gameStore.set(inventoryUI, inventory)              
                })                
            }
        }
    })

    player.onPatrolFinished(()=> {
        if(player.hp === 0) return
        if(player.path?.length) {
            player.waypoints = [player.path[0]]
            player.path.splice(0, 1)
            setDirection(player, player.waypoints[0])
        }else{
            player.stop()
            player.frame = 0 
        }
    })    

    setUIElements(player, map)
    // #endregion  
}
