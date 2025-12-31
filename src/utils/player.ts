import k from '../lib/kaplay'
import type { GameObj} from "kaplay";

import { setCameraPosition } from './camera';

// Store
// import { createStore } from 'jotai'
// import { setting } from '../store/setting';
// const store = createStore()

const {
    area,
    body,
    getData,
    isKeyDown,
    pos,
    Rect,
    setData,
    sprite,
    vec2
} = k

export const createPlayerSprite = (map: GameObj, x: number, y: number, mapWidth: number, mapHeight: number,) => {
    console.log(x, y)
    const player = map.add([
        sprite("player"), 
        area(),
        body(),
        pos(x * map.tileWidth, y * map.tileWidth),
        {
            speed: 100,
        },
        // tags
        "player"
    ]);
    console.log('player', player)

    // Add an invisible area for the player
    player.add([
        area({ shape: new Rect(vec2(0), map.tileWidth, map.tileWidth) }),
        // Position relative to the player
        pos(0, player.height),
        // Attributes
        // Tags
        "player"
    ])

    setCameraPosition(player, mapWidth, mapHeight)

    // Enable control
    setData('ready', true)    

    // #region Player control
    player.onUpdate(() => {
        if(!getData('ready', false)) return

        if(!isKeyDown()){
            player.stop()
            // setCameraPosition(mapWidth, mapHeight)
        }        

        if (isKeyDown("left") && !isKeyDown([ "right", "up", "down" ])){
            setCameraPosition(player, mapWidth, mapHeight)
            if(player.getCurAnim()?.name !== 'walk') player.play("walk")
            player.flipX = false

            const wPos = player.worldPos()
            if(wPos && wPos.x > 0 ) player.move(-player.speed, 0)
            // Move the invisible area
            player.children[0].pos.x = -map.tileWidth
            player.children[0].pos.y = (player.height - map.tileWidth)
                
            // checkStep(player)
        }
        
        if (isKeyDown("right") && !isKeyDown([ "left", "up", "down" ])){
            setCameraPosition(player, mapWidth, mapHeight)
            if(player.getCurAnim()?.name !== 'walk') player.play("walk")
            player.flipX = true

            const wPos = player.worldPos()
            if(wPos && (wPos.x + player.width) < mapWidth ) player.move(player.speed, 0)
            // Move the invisible area
            player.children[0].pos.x = player.width
            player.children[0].pos.y = (player.height - map.tileWidth)                

            // checkStep(player)
        }        

        if (isKeyDown("up") && !isKeyDown([ "right", "left", "down" ])){
            setCameraPosition(player, mapWidth, mapHeight)
            if(player.getCurAnim()?.name !== 'walk') player.play("walk")

            const wPos = player.worldPos()
            if(wPos && wPos.y > 0 ) player.move(0, -player.speed)
            // Move the invisible area
            player.children[0].pos.x = 0
            player.children[0].pos.y = -map.tileWidth                

            // checkStep(player)
        }     
        
        if (isKeyDown("down") && !isKeyDown([ "right", "up", "left" ])){
            setCameraPosition(player, mapWidth, mapHeight)
            if(player.getCurAnim()?.name !== 'walk') player.play("walk")

            const wPos = player.worldPos()
            if(wPos && (wPos.y + player.height) < mapHeight ) player.move(0, player.speed)
            // Move the invisible area
            player.children[0].pos.x = 0
            player.children[0].pos.y = player.height              

            // checkStep(player)
        }     
    })  
    // #endregion  
}
