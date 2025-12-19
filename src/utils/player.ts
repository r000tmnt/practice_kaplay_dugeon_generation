import k from '../lib/kaplay'
import type { GameObj } from "kaplay";

// Store
import { createStore } from 'jotai'
import { setting } from '../store/setting';
const store = createStore()

const {
    area,
    body,
    getData,
    isKeyDown,
    pos,
    Rect,
    setData,
    sprite,
    setCamPos,
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
    ])

    setCameraPosition(map, player, mapWidth, mapHeight)

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
            setCameraPosition(map, player, mapWidth, mapHeight)
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
            setCameraPosition(map, player, mapWidth, mapHeight)
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
            setCameraPosition(map, player, mapWidth, mapHeight)
            if(player.getCurAnim()?.name !== 'walk') player.play("walk")

            const wPos = player.worldPos()
            if(wPos && wPos.y > 0 ) player.move(0, -player.speed)
            // Move the invisible area
            player.children[0].pos.x = 0
            player.children[0].pos.y = -map.tileWidth                

            // checkStep(player)
        }     
        
        if (isKeyDown("down") && !isKeyDown([ "right", "up", "left" ])){
            setCameraPosition(map, player, mapWidth, mapHeight)
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

// #region Camera position
const setCameraPosition = (map: GameObj, player: GameObj, mapWidth: number, mapHeight: number) => {
    // Decide to move the camera or not
    const { width, height } = store.get(setting)
    const middleX = width / 2 
    const middleY = height / 2 

    const wPos = player.worldPos()
    let inX = false, inY = false;

    console.log(wPos)

    // Player pos relative to the game world
    if((wPos.x + middleX) <= mapWidth && (wPos.x - middleX) >= 0){ 
        inX = true
    }

    if((wPos.y - middleY) >= 0 && (wPos.y + middleY) <= mapHeight){ 
        inY = true
    }
    
    // Camera follows player
    if(inX && inY){
        console.log('camera follows player')
        setCamPos(player.pos)
    }
        
    if(inX && !inY){
        // Reached top?
        if((wPos.y - middleY) <= 0){
            console.log('camera top')
            setCamPos(wPos.x, middleY)
        }

        // Reached down?
        if((wPos.y + middleY) >= mapHeight){
            console.log('camera down')
            setCamPos(wPos.x, mapHeight - middleY)
        }
    }

    if(!inX && inY){
        // Reached right?
        if((wPos.x + middleX) >= mapWidth){
            console.log('camera right')
            setCamPos(mapWidth - middleX, wPos.y)
        }

        // Reached left?
        if((wPos.x - middleX) <= 0){
            console.log('camera left')
            setCamPos(middleX, wPos.y)
        }
    }

    if(!inX && !inY){
        // Reached top right?
        if((wPos.y - middleY) <= 0 && (wPos.x + middleX) >= mapWidth){
            console.log('camera top right')
            setCamPos(mapWidth - middleX, middleY)
        }

        // Reached down right?
        if((wPos.y + middleY) >= mapHeight && (wPos.x + middleX) >= mapWidth){
            console.log('camera down right')
            setCamPos(mapWidth - middleX, mapHeight - middleY)
        }

        // Reached down left?
        if((wPos.y + middleY) >= mapHeight && (wPos.x - middleX) <= 0){
            console.log('camera down left')
            setCamPos(middleX, mapHeight - middleY)
        }
        
        // Reached top left?
        if((wPos.y - middleY) <= 0 && (wPos.x - middleX) <= 0){
            console.log('camera top left')
            setCamPos(middleX, middleY)
        }
    }
}
// #endregion    
