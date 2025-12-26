import k from '../lib/kaplay'
import type { GameObj } from "kaplay";

// Store
import { createStore } from 'jotai'
import { gameState } from '../store/game';
import { setting } from '../store/setting';
import type { prop } from '../model/map';
const store = createStore()

const {
    area,
    body,
    get,
    getData,
    getCamPos,
    isKeyDown,
    pos,
    Rect,
    setData,
    sprite,
    setCamPos,
    vec2
} = k

const chunkMargin = 5

// #region Camera position
export const setCameraPosition = (player: GameObj, mapWidth: number, mapHeight: number) => {
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
        getCameraEdges('middle', mapWidth, mapHeight)
    }
        
    if(inX && !inY){
        // Reached top?
        if((wPos.y - middleY) <= 0){
            console.log('camera top')
            setCamPos(wPos.x, middleY)
            getCameraEdges('top', mapWidth, mapHeight)
        }

        // Reached down?
        if((wPos.y + middleY) >= mapHeight){
            console.log('camera down')
            setCamPos(wPos.x, mapHeight - middleY)
            getCameraEdges('down', mapWidth, mapHeight)
        }
    }

    if(!inX && inY){
        // Reached right?
        if((wPos.x + middleX) >= mapWidth){
            console.log('camera right')
            setCamPos(mapWidth - middleX, wPos.y)
            getCameraEdges('right', mapWidth, mapHeight)
        }

        // Reached left?
        if((wPos.x - middleX) <= 0){
            console.log('camera left')
            setCamPos(middleX, wPos.y)
            getCameraEdges('left', mapWidth, mapHeight)
        }
    }

    if(!inX && !inY){
        // Reached top right?
        if((wPos.y - middleY) <= 0 && (wPos.x + middleX) >= mapWidth){
            console.log('camera top right')
            setCamPos(mapWidth - middleX, middleY)
            getCameraEdges('topRight', mapWidth, mapHeight)
        }

        // Reached down right?
        if((wPos.y + middleY) >= mapHeight && (wPos.x + middleX) >= mapWidth){
            console.log('camera down right')
            setCamPos(mapWidth - middleX, mapHeight - middleY)
            getCameraEdges('downRight', mapWidth, mapHeight)
        }

        // Reached down left?
        if((wPos.y + middleY) >= mapHeight && (wPos.x - middleX) <= 0){
            console.log('camera down left')
            setCamPos(middleX, mapHeight - middleY)
            getCameraEdges('downLeft', mapWidth, mapHeight)
        }
        
        // Reached top left?
        if((wPos.y - middleY) <= 0 && (wPos.x - middleX) <= 0){
            console.log('camera top left')
            setCamPos(middleX, middleY)
            getCameraEdges('topLeft', mapWidth, mapHeight)
        }
    }
}
// #endregion    

// #region Active / Deactive chunks
const getCameraEdges = (direction: string, mapWidth: number, mapHeight: number) => {
    // Get the distance between the player and the camera edge
    const { width, height, tileWidth } = store.get(setting)
    const cPos = getCamPos()
    const halfWidth = width / 2
    const halfHeight = height / 2

    switch(direction){
        case 'top':{
            const top = Math.floor(0 / tileWidth)
            const down = Math.floor((0 + halfHeight) / tileWidth)
            const left = Math.floor((cPos.x - halfWidth) / tileWidth)
            const right = Math.floor((cPos.x + halfWidth) / tileWidth)

            updateChunks({ top, down, left, right })
        }
        break;
        case 'down':{
            const top = Math.floor((mapHeight - height) / tileWidth)
            const down = Math.floor(mapHeight / tileWidth)
            const left = Math.floor((cPos.x - halfWidth) / tileWidth)
            const right = Math.floor((cPos.x + halfWidth) / tileWidth)

            updateChunks({ top, down, left, right })
        }
        break;
        case 'left':{
            const top = Math.floor((cPos.y - halfHeight) / tileWidth)
            const down = Math.floor((cPos.y + halfHeight) / tileWidth)
            const left = Math.floor(0 / tileWidth)
            const right = Math.floor((0 + halfWidth) / tileWidth)

            updateChunks({ top, down, left, right })
        }
        break;
        case 'right':{
            const top = Math.floor((cPos.y - halfHeight) / tileWidth)
            const down = Math.floor((cPos.y + halfHeight) / tileWidth)
            const left = Math.floor((mapWidth - width) / tileWidth)
            const right = Math.floor(mapWidth / tileWidth)

            updateChunks({ top, down, left, right })
        }
        break;
        case 'middle':{
            const top = Math.floor((cPos.y - halfHeight) / tileWidth)
            const down = Math.floor((cPos.y + halfHeight) / tileWidth)
            const left = Math.floor((cPos.x - halfWidth) / tileWidth)
            const right = Math.floor((cPos.x + halfWidth) / tileWidth)

            updateChunks({ top, down, left, right })
        }
        break;        
        case 'topLeft':{
            const top = Math.floor(0 / tileWidth)
            const down = Math.floor((0 + halfHeight) / tileWidth)
            const left = Math.floor(0 / tileWidth)
            const right = Math.floor((0 + halfWidth) / tileWidth)

            updateChunks({ top, down, left, right })
        }
        break;
        case 'topRight':{
            const top = Math.floor(0 / tileWidth)
            const down = Math.floor((0 + halfHeight) / tileWidth)
            const left = Math.floor((mapWidth - width) / tileWidth)
            const right = Math.floor(mapWidth / tileWidth)

            updateChunks({ top, down, left, right })
        }
        break;
        case 'downLeft':{
            const top = Math.floor((mapHeight - height) / tileWidth)
            const down = Math.floor(mapHeight / tileWidth)
            const left = Math.floor(0 / tileWidth)
            const right = Math.floor((0 + halfWidth) / tileWidth)

            updateChunks({ top, down, left, right })
        }
        break;
        case 'downRight':{
            const top = Math.floor((mapHeight - height) / tileWidth)
            const down = Math.floor(mapHeight / tileWidth)
            const left = Math.floor((mapWidth - width) / tileWidth)
            const right = Math.floor(mapWidth / tileWidth)

            updateChunks({ top, down, left, right })
        }
        break;        
    }    
}

const updateChunks = (camera: {top: number, down: number, left: number, right: number}) => {
    // Get the distance between the player and the camera edge
    const { chunkSize } = store.get(setting)

    const { top, down, left, right } = camera

    const cT = Math.floor(top / chunkSize) - chunkMargin
    const cD = Math.floor(down / chunkSize) + chunkMargin
    const cL = Math.floor(left / chunkSize) - chunkMargin
    const cR = Math.floor(right / chunkSize) + chunkMargin   
    
    const needed = new Set()

    for (let cy = cT; cy <= cD; cy++) {
        for (let cx = cL; cx <= cR; cx++) {
            needed.add(`${cx},${cy}`)
            activateChunk(cx, cy)
        }
    }    
}
// #endregion

const activateChunk = (x: number, y:number) => {
    const { chunks } = store.get(gameState)
    const { tileWidth } = store.get(setting)
    const key = `${x},${y}`
    const chunk = chunks.get(key)

    if(!chunk || chunk.active) return

    chunk.active = true

    for(const prop of chunk.props){
        const obj = spawnObject(prop, tileWidth)
        chunk.objects.push(obj as GameObj)
    }
}

const spawnObject = (prop: prop, tileWidth: number) => {
    const map = get('map')
    switch(prop.type){
        case 'pot':
            return map[0].add([
                sprite('pot'),
                pos(prop.x * tileWidth, prop.y * tileWidth),
                area(),
                body({ isStatic: true }),
                {
                    broken: prop.broken
                }
            ])
        case 'chest':

        break;
        case 'enemy':
        
        break;
    }
}
