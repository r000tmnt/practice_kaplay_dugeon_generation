import k from '../lib/kaplay'
import type { GameObj, MouseButton } from "kaplay";
import type { roomNode } from '../model/map'
import handData from '../data/hand.json'
import { setCameraPosition } from './camera';
import { createHitBox } from './hitBox'
import { gameStore, getGameStoreValue, inventoryUI } from '../store/game';
import { RoomState } from '../model/map'
import type { item } from '../model/item';
// import { getOptionValue } from '../store/setting';
import { spawnEnemiesForRoom } from './enemy';
import playerData from '../data/player.json'
import { setCardUI, setUIElements } from '../components/UI';
import { setInventoryUI } from '../components/inventory'
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
    easings,
    getData,
    // getSprite,
    get,
    health,
    isKeyDown,
    isMousePressed,
    layer,
    lifespan,
    onKeyRelease,
    opacity,
    pathfinder,
    patrol,
    pos,
    Rect,
    rgb,
    // rotate,
    setData,
    state,
    stay,
    sprite,
    text,
    tween,
    usePostEffect,
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

export const equipItem = (player: GameObj, key: string, item: item, ) => {
    // Check item requirements
    const { required } = item
    let conditionMeet = true

    if(required){
        for(const [key, value] of Object.entries(required)){
            if(
                key === 'lv' && player.lv < Number(value) ||
                player.attribute[key] && player.attribute[key] < Number(value)
            ){
                conditionMeet = false
                break
            }
        }        
    }
    
    if(!conditionMeet) return false

    // If slot is taken
    unequipItem(player, key)

    player.equip[key] = item

    // Equip gear
    if(item.attribute){
        Object.entries(item.attribute).forEach(([key, value]) => {
            player.attribute[key] += Number(value)
        })        
    }

    if(item.secondary){
        Object.entries(item.secondary).forEach(([key, value]) => {
            player.secondary[key] += Number(value)
        })           
    }

    if(item.resist){
        Object.entries(item.resist).forEach(([key, value]) => {
            player.resist[key] += Number(value)
        })            
    }

    if(item.max){
        Object.entries(item.max).forEach(([key, value]) => {
            player.max[key] += Number(value)
            if(key.includes('hp')){
                player.maxHp += Number(value)
            }
        })        
    }

    return true
}

export const unequipItem = (player: GameObj, key: string) => {
    const gear = player.equip[key]

    if(gear?.id){
        // Take off gear
        if(gear.attribute){
            Object.entries(gear.attribute).forEach(([key, value]) => {
                player.attribute[key] -= Number(value)
            })            
        }

        if(gear.secondary){
            Object.entries(gear.secondary).forEach(([key, value]) => {
                player.secondary[key] -= Number(value)
            })               
        }
 
        if(gear.resist){
            Object.entries(gear.resist).forEach(([key, value]) => {
                player.resist[key] -= Number(value)
            })    
        }
            
        if(gear.max){
            Object.entries(gear.max).forEach(([key, value]) => {
                player.max[key] -= Number(value)
                if(key.includes('hp')){
                    player.maxHp -= Number(value)
                }
            })              
        }

        player.equip[key] = {}
    }
}

export const createPlayerSprite = async(map: GameObj, x: number, y: number, mapWidth: number, mapHeight: number, data: typeof playerData | null = null) => {
    if(!data) data = playerData
    const { nav } = await import('../utils/bspDungeonGenerator');
    const sizeWithPadding = map.tileWidth + 10 // 5px for padding on each side
    const { keys } = getOptionValue()

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
        stay(),
        state("active", ["active", "pause"]),
        pos((x * map.tileWidth) + (sizeWithPadding / 2), (y * map.tileWidth) + (sizeWithPadding / 2)),
        {
            facing: 'left',
            path: [],
            ...data,
            gainExp: (exp: number) => {
                const { effect } = getGameStoreValue()

                const boost = effect.find(e => e.exp)

                exp = (boost)? Math.floor(exp * boost.exp) : exp

                player.exp += player.lv === player.max.lv? player.max.exp : exp
                // Check if player need to levelup
                player.levelUp()
            },
            levelUp: () => {
                if(player.exp >= player.max.exp && player.lv < player.max.lv){
                    // Level up
                    player.lv += 1
                    player.pt += 3

                    const textHolder = player.add([
                        text("[light]LEVEL UP[/light]", { 
                            size: map.tileWidth / 2,
                            align: 'center', 
                            styles: {
                                "light": {
                                    color: rgb(250,250,210)
                                }
                            } 
                        }),
                        pos(0, -map.tileWidth),
                        anchor('center'),
                        lifespan(1, { fade: 0.5 }),
                        opacity(1)
                    ])

                    tween(
                        textHolder.pos.y,
                        textHolder.pos.y - 10,
                        0.5,
                        (v) => { textHolder.pos.y = v }
                    )

                    // Random growth
                    Object.entries(player.attribute).forEach(attr => {
                        const rng = Math.floor(Math.random() * (GROWTH.length - 1))
                        switch(attr[0]){
                            case 'hp':
                                player.max.hp += GROWTH[rng]
                                player.attribute.hp += player.max.hp - player.hp
                                player.hp += player.max.hp - player.hp
                            break;
                            case 'mp':
                                player.max.mp += GROWTH[rng]
                                player.attribute.mp += player.max.mp - player.attribute.mp
                            break;
                            default:
                                attr[1] += GROWTH[rng]
                            break;
                        }
                    })

                    // Increase required exp for next lv
                    player.max.exp += Math.floor(player.max.exp * 1.5)
                    // In case if exp is much higher
                    player.levelUp() 
                }                
            }
        },
        // tags
        "player"
    ]);

    // Equip weapon
    equipItem(player, 'rightHand', handData[0]) 

    console.log('player', player)

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
            enemy.secondary.move_speed = player.secondary.move_speed
        }
    })

    player.onCollideEnd('enemy', (enemy: GameObj) => {
        enemy.isStatic = false
        player.isStatic = false
        enemy.secondary.move_speed = 75
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
        if(!getData('ready', false) || player.state === 'pause') return

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

                if (isKeyDown(keys.left)){
                    player.facing = 'left'
                    setCameraPosition(player, mapWidth, mapHeight)
                    if(currentAnim?.name !== 'walk') player.play("walk")
                    player.flipX = false
                    diagonalFactor.x = -1
                }
                
                if (isKeyDown(keys.right)){
                    player.facing = 'right'
                    setCameraPosition(player, mapWidth, mapHeight)
                    if(currentAnim?.name !== 'walk') player.play("walk")
                    player.flipX = true
                    diagonalFactor.x = 1
                }        

                if (isKeyDown(keys.up)){
                    player.facing = 'top'
                    setCameraPosition(player, mapWidth, mapHeight)
                    if(currentAnim?.name !== 'walk') player.play("walk")
                    diagonalFactor.y = -1
                }     
                
                if (isKeyDown(keys.down)){
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

                if ( 
                    keys.main_attack.includes('mouse')? 
                        isMousePressed(keys.main_attack.split('_')[1] as MouseButton) : 
                        isKeyDown(keys.main_attack)
                ){
                    const listOpen = getData('listOpen')
                    const { inventory } = getGameStoreValue()
                    if(currentAnim?.name !== 'attack' && inventory.hide && !listOpen) {
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

    // inventory, option, skill, map
    onKeyRelease([
        keys.inventory,
        keys.option,
        keys.skill,
        keys.map
    ], (key) => {
        if(!getData('ready')) return

        if(key === keys.inventory){
            if(player.state === 'pause') return
            const { inventory } = getGameStoreValue()
            inventory.hide = !inventory.hide

            setInventoryUI(get('ui')[0], player, inventory.hide).then(() => {
                gameStore.set(inventoryUI, inventory)              
            })   
        }
        // console.log('release key', key)
        if(key === keys.option){
            const cardSelecting = getData('card_selecting')

            if(cardSelecting === true) setCardUI(false)
            else{
            // Open game settings
            }
        }

        if(key === keys.skill){
            if(player.state === 'pause') return
            // Open skill menu
        }

        if(key === keys.map){
            if(player.state === 'pause') return
            // Toggle mini map
        }        
    })

    // Quick slots
    onKeyRelease([
        keys.quick_slot_1,
        keys.quick_slot_2,
        keys.quick_slot_3,
        keys.quick_slot_4,
        keys.quick_slot_5,
        keys.quick_slot_6,
        keys.quick_slot_7,
        keys.quick_slot_8,
        keys.quick_slot_9,
        keys.quick_slot_10,
    ], (key) => {
        // toggle quick slot 
        if(!getData('ready') || player.state === 'pause') return
        
        const { quickSlot } = getGameStoreValue()

        let index = -1

        switch(true){
            case key === keys.quick_slot_1:
                index = 0
            break;
            case key === keys.quick_slot_2:
                index = 1
            break;
            case key === keys.quick_slot_3:
                index = 2
            break;
            case key === keys.quick_slot_4:
                index = 3
            break;
            case key === keys.quick_slot_5:
                index = 4
            break;
            case key === keys.quick_slot_6:
                index = 5
            break;
            case key === keys.quick_slot_7:
                index = 6
            break;
            case key === keys.quick_slot_8:
                index = 7
            break;
            case key === keys.quick_slot_9:
                index = 8
            break;
            case key === keys.quick_slot_10:
                index = 9
            break;                                                                                                            
        }

        if(quickSlot[index]){
            // use item or case skill
            const item = quickSlot[index];
            if(item?.quantity !== undefined){
                item.quantity -= 1

                const { attribute, resist, secondary } = item

                if(attribute){
                    for(const [key, value] of Object.entries(attribute)){
                        switch(key){
                            case 'hp':{
                                const realValue = value > (player.max.hp - player.hp)? player.max.hp - player.hp : value 
                                player.hp += realValue
                                player.attribute.hp = player.hp                                
                            }
                            break;
                            case 'mp':
                                player.attribute.mp += value > (player.max.mp - player.attribute.mp)? player.max.mp - player.attribute.mp : value 
                            break;                            
                            case 'physique':
                            case 'mentality':
                            case 'agility':
                                player.attribute[key] += value
                            break;
                        }
                    }                   
                }

                if(resist){
                    //
                }

                if(secondary){
                    //
                }
            }
        }
    })

    player.onPatrolFinished(()=> {
        if(player.hp === 0 || player.state === 'pause') return
        if(player.path?.length) {
            player.waypoints = [player.path[0]]
            player.path.splice(0, 1)
            setDirection(player, player.waypoints[0])
        }else{
            player.stop()
            player.frame = 0 
        }
    })
    
    player.onStateEnter('active', () => {
        player.paused = false
    })    

    player.onStateEnter('pause', () => {
        player.paused = true
    })

    // If transit from another map, reveal the map
    if(map.name === 'next'){
        setCameraPosition(player, mapWidth, mapHeight)

        tween(
            1,
            0,
            0.3,
            (v) => { 
                usePostEffect("fadeTransition", () => ({ "u_progress": v }))
            },
            easings.easeInOutQuad
        ).onEnd(() => {
            // Enable control
            setData('ready', true)    
        })    
    }else{
        setCameraPosition(player, mapWidth, mapHeight)
        // Enable control
        setData('ready', true)    

        setUIElements(player)
    }
    // #endregion  
}
