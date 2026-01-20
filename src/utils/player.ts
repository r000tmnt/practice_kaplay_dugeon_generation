import k from '../lib/kaplay'
import type { GameObj} from "kaplay";
import type { prop, roomNode } from '../model/map'

import { setCameraPosition } from './camera';
import { createHitBox } from './hitBox'
import { gameState, gameStore, getGameStoreValue } from '../store/game';
import { RoomState } from '../model/map'
import { getOptionValue } from '../store/setting';
import { spawnEnemiesForRoom } from './enemy';

// Store
// import { createStore } from 'jotai'
// import { setting } from '../store/setting';
// const store = createStore()

const {
    add,
    area,
    anchor,
    body,
    getData,
    get,
    // health,
    isKeyDown,
    layer,
    pos,
    Rect,
    // rotate,
    // setData,
    // state,
    sprite,
    vec2
} = k

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

export const createPlayerSprite = (map: GameObj, x: number, y: number, mapWidth: number, mapHeight: number,) => {
    // console.log(x, y)
    const sizeWithPadding = map.tileWidth + 10 // 5px for padding on each side
    const player = add([
        sprite("player"), 
        anchor('center'),
        area({ shape: new Rect(vec2(0), map.tileWidth, map.tileWidth) }),
        body(),
        layer('game'),
        pos((x * map.tileWidth) + (sizeWithPadding / 2), (y * map.tileWidth) + (sizeWithPadding / 2)),
        {
            speed: 100,
            direction: 'left',
        },
        // tags
        "player"
    ]);
    console.log('player', player)

    // player.onAnimStart((anim: string) => {
    //     console.log(anim)
    // })

    setCameraPosition(player, mapWidth, mapHeight)

    // #region Player control
    player.onUpdate(() => {
        if(!getData('ready', false)) return

        const currentAnim = player.getCurAnim()

        // console.log(currentAnim)

        if(!isKeyDown() && currentAnim?.name === 'walk'){
            player.frame = 0
        }

        switch(currentAnim?.name){
            case 'attack':
                if(!player.get('attack').length && currentAnim.frameIndex === 2) createHitBox(player, player.direction, currentAnim, 'collide', ['player'])         
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
                player.move(unitVector.scale(player.speed))

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
                                hitBoxes.forEach(hitBox => hitBox.destroy())
                            }
                        })
                    }
                }                
            }
            break;
        }        
    })  
    // #endregion  
}
