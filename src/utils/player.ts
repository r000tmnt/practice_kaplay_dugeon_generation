import k from '../lib/kaplay'
import type { GameObj} from "kaplay";

import { setCameraPosition } from './camera';

// Store
// import { createStore } from 'jotai'
// import { setting } from '../store/setting';
// const store = createStore()

const {
    area,
    anchor,
    body,
    getData,
    isKeyDown,
    pos,
    Rect,
    rotate,
    setData,
    sprite,
    vec2
} = k

export const createPlayerSprite = (map: GameObj, x: number, y: number, mapWidth: number, mapHeight: number,) => {
    // console.log(x, y)
    const sizeWithPadding = map.tileWidth + 10 // 5px for padding on each side
    const player = map.add([
        sprite("player", {
            frame: 7
        }), 
        anchor('center'),
        area({ shape: new Rect(vec2(0), map.tileWidth, map.tileWidth) }),
        body(),
        pos((x * map.tileWidth) + (sizeWithPadding / 2), (y * map.tileWidth) + (sizeWithPadding / 2)),
        {
            speed: 100,
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

        if(!isKeyDown()){
            switch(currentAnim?.name){
                case 'attack':
                    // if(currentAnim.frameIndex === 0){
                    //     player.width = 41
                    //     player.height = 58
                    // }

                    // if(currentAnim.frameIndex === 1){
                    //     player.width = 53
                    //     player.height = 58
                    // }
                    
                    // if(currentAnim.frameIndex === 2){
                    //     player.width = 52
                    //     player.height = 48
                    // }                      
                break;
                default:
                    player.stop()
                break;
            }
        }

        if (isKeyDown("left") && !isKeyDown([ "right", "up", "down" ])){
            setCameraPosition(player, mapWidth, mapHeight)
            if(currentAnim?.name !== 'walk') player.play("walk")
            player.flipX = false

            const wPos = player.worldPos()
            if(wPos && wPos.x > 0 ) player.move(-player.speed, 0)
        }
        
        if (isKeyDown("right") && !isKeyDown([ "left", "up", "down" ])){
            setCameraPosition(player, mapWidth, mapHeight)
            if(currentAnim?.name !== 'walk') player.play("walk")
            player.flipX = true

            const wPos = player.worldPos()
            if(wPos && (wPos.x + player.width) < mapWidth ) player.move(player.speed, 0)
        }        

        if (isKeyDown("up") && !isKeyDown([ "right", "left", "down" ])){
            setCameraPosition(player, mapWidth, mapHeight)
            if(currentAnim?.name !== 'walk') player.play("walk")

            const wPos = player.worldPos()
            if(wPos && wPos.y > 0 ) player.move(0, -player.speed)
        }     
        
        if (isKeyDown("down") && !isKeyDown([ "right", "up", "left" ])){
            setCameraPosition(player, mapWidth, mapHeight)
            if(currentAnim?.name !== 'walk') player.play("walk")

            const wPos = player.worldPos()
            if(wPos && (wPos.y + player.height) < mapHeight ) player.move(0, player.speed)
        }     

        if (isKeyDown('z')){
            if(currentAnim?.name !== 'attack') {
                player.play("attack", {
                    onEnd: () => {
                        player.frame = 0
                    }
                })                
            }
        }
    })  
    // #endregion  
}
