import k from '../lib/kaplay'
import type { GameObj} from "kaplay";

import { setCameraPosition } from './camera';
import { createHitBox } from './hitBox'

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
    isKeyDown,
    layer,
    pos,
    Rect,
    // rotate,
    // setData,
    sprite,
    vec2
} = k

export const createPlayerSprite = (map: GameObj, x: number, y: number, mapWidth: number, mapHeight: number,) => {
    // console.log(x, y)
    const sizeWithPadding = map.tileWidth + 10 // 5px for padding on each side
    const player = add([
        sprite("player", {
            frame: 7
        }), 
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
            player.stop()
            player.frame = 0
        }

        switch(currentAnim?.name){
            case 'attack':
                if(!player.get('attack').length && currentAnim.frameIndex === 2) createHitBox(player, player.direction, currentAnim)         
            break;
            default:
                //
            break;
        }        

        if (isKeyDown("left") && !isKeyDown([ "right", "up", "down" ])){
            player.direction = 'left'
            setCameraPosition(player, mapWidth, mapHeight)
            if(currentAnim?.name !== 'walk') player.play("walk")
            player.flipX = false

            const wPos = player.worldPos()
            if(wPos && wPos.x > 0 ) player.move(-player.speed, 0)
        }
        
        if (isKeyDown("right") && !isKeyDown([ "left", "up", "down" ])){
            player.direction = 'right'
            setCameraPosition(player, mapWidth, mapHeight)
            if(currentAnim?.name !== 'walk') player.play("walk")
            player.flipX = true

            const wPos = player.worldPos()
            if(wPos && (wPos.x + player.width) < mapWidth ) player.move(player.speed, 0)
        }        

        if (isKeyDown("up") && !isKeyDown([ "right", "left", "down" ])){
            player.direction = 'top'
            setCameraPosition(player, mapWidth, mapHeight)
            if(currentAnim?.name !== 'walk') player.play("walk")

            const wPos = player.worldPos()
            if(wPos && wPos.y > 0 ) player.move(0, -player.speed)
        }     
        
        if (isKeyDown("down") && !isKeyDown([ "right", "up", "left" ])){
            player.direction = 'down'
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
                        console.log('animation end')
                        // Destroy hitBoxes
                        const hitBoxes = player.get('hitBox')
                        hitBoxes.forEach(hitBox => hitBox.destroy())
                    }
                })
            }
        }
    })  
    // #endregion  
}
