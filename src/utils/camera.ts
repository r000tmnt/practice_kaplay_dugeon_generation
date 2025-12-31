import k from '../lib/kaplay'
import type { GameObj } from "kaplay";

// Store
import { gameState, gameStore, getGameStoreValue } from '../store/game';
import { setting, getOptionValue } from '../store/setting';
import type { chunk, prop } from '../model/map';

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
    const { width, height } = getOptionValue()
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
    const { width, height, tileWidth } = getOptionValue()
    const cPos = getCamPos()
    const halfWidth = width / 2
    const halfHeight = height / 2

    switch(direction){
        case 'top':{
            const top = Math.floor(0 / tileWidth)
            const down = Math.floor(height / tileWidth)
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
            const right = Math.floor(width / tileWidth)

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
            const down = Math.floor(height / tileWidth)
            const left = Math.floor(0 / tileWidth)
            const right = Math.floor(width / tileWidth)

            updateChunks({ top, down, left, right })
        }
        break;
        case 'topRight':{
            const top = Math.floor(0 / tileWidth)
            const down = Math.floor(height / tileWidth)
            const left = Math.floor((mapWidth - width) / tileWidth)
            const right = Math.floor(mapWidth / tileWidth)

            updateChunks({ top, down, left, right })
        }
        break;
        case 'downLeft':{
            const top = Math.floor((mapHeight - height) / tileWidth)
            const down = Math.floor(mapHeight / tileWidth)
            const left = Math.floor(0 / tileWidth)
            const right = Math.floor(width / tileWidth)

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
    // const { chunkSize } = getOptionValue()

    const { top, down, left, right } = camera

    const cT = top - chunkMargin
    const cD = down + chunkMargin
    const cL = left - chunkMargin
    const cR = right + chunkMargin   
    
    const needed: string[] = []

    for (let cy = cT; cy <= cD; cy++) {
        for (let cx = cL; cx <= cR; cx++) {
            const active = activateChunk(cx, cy)
            if(active) needed.push(`${cx},${cy}`)
        }
    }    

    // Deactivate chunks outside of margins    
    deactivateChunk(needed)
}
// #endregion

const activateChunk = (x: number, y:number) => {
    const { chunks } = getGameStoreValue()
    const { tileWidth } = getOptionValue()
    const copyChunks = JSON.parse(JSON.stringify(chunks, (key, value) => {
        console.log(key + ': '+ value)
        return value
    }))
    const chunk = copyChunks[`${x},${y}`]

    if(!chunk || chunk.active) return false

    chunk.active = true

    for(const prop of chunk.props){
        const obj = spawnObject(prop, tileWidth)
        if(obj) chunk.objects.push(obj.pos)
    }

    // Update stored chunk
    gameStore.set(gameState, (prev) => ({
        ...prev,
        chunks: copyChunks
    }))
    return true
}

const deactivateChunk = (activatedChunks: string[]) => {
    const { chunks } = getGameStoreValue()
    const copyChunks = JSON.parse(JSON.stringify(chunks))

    const chunksOutSide : Record<string, chunk> = {}
    Object.entries(copyChunks).filter(([key, value]) => {
        if(!activatedChunks.find(a => a === key)){
            chunksOutSide[key] = copyChunks[key]
        }
    })

    for(const pos in chunksOutSide){
        chunksOutSide[pos].active = false
        chunksOutSide[pos].props.forEach((prop, index) => {
            //
        })
    }

    // Update stored chunk
    gameStore.set(gameState, (prev) => ({
        ...prev,
        chunks: copyChunks
    }))    
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
                },
                // Tags
                "pot"
            ])
        case 'chest':

        break;
        case 'enemy':
        
        break;
    }
}
