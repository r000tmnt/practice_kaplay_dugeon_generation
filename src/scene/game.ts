import k from '../lib/kaplay'
import { type GameObj } from 'kaplay';
import { generateBSPDungeon } from '../utils/bspDungeonGenerator';
import { createPlayerSprite } from '../utils/player';
import { spawnObject } from '../utils/staticObject';

// Store
import { createStore } from 'jotai'
import { gameState, gameStore, getGameStoreValue } from '../store/game';
import { setting } from '../store/setting';
import { setCameraPosition } from '../utils/camera';
// import type { room } from '../model/map';
const store = createStore()

store.sub(gameState, () => {
    const newValue = store.get(gameState)
    console.log('newValue ', newValue)
})

const { 
    add,
    // area,
    // body,
    drawSprite,
    go,
    get,
    getLayers,
    loadSprite,
    opacity,
    pos,
    // polygon,
    Rect,
    stay,
    setLayers,
    setData,
    scene,
    vec2,
} = k

let map : GameObj = {} as GameObj
// let mapAsset : Asset = {} as Asset

export default function initGame(){
    // Define layers
    const layers = getLayers()
    if(!layers) setLayers(['bg', 'game', "fg", "ui"], "game")    

    scene('game', async(map = null) => {
        // Clear localStorage
        localStorage.clear()        

        setData('ready', false)
        setMap(map?? 'testMap')
    })

    go('game')    
}

const setMap = async(name: string) => {
    const {level, danger} = store.get(gameState)
    const { tileWidth } = store.get(setting)

    if(!get('map').length) map = add([pos(0, 0), opacity(1), stay(['game']), "map", { tileWidth, name }])

    // setCamPos(map.pos.x + ((tileWidth * 16) / 2), map.pos.y + ((tileWidth * 9) / 2))

    // If level exist
    if(level.length){
        // Get the rooms
        const { entrance, exit } = store.get(gameState)

        // Draw map
        drawMap(level, entrance, exit, name, tileWidth)

        // initPlayer(level, entrance as { x: number, y: number }, tileWidth)        
    }else{
        // Generate the map
        const dungeon = await generateBSPDungeon('demo_player' + danger + Date.now());

        if(dungeon){
            console.log('seed', dungeon.seed)
            const { grid, entrance, exit, door } = dungeon

            console.log(entrance, exit)
            console.log(door)
            // console.log('grid:', grid)

            if(entrance) grid[entrance.y][entrance.x] = 2

            if(exit) grid[exit.y][exit.x] = 2

            console.log(
                grid
                    .map(row => row.map(cell => {
                        switch(cell){
                            case 1:
                                return '#'
                            case 2:
                                return '□'
                            default:
                                return '.'
                        }
                    }).join(""))
                    .join("\n")
            );

            drawMap(grid, entrance as { x: number, y: number }, exit as { x: number, y: number }, name, tileWidth)            
        }
    }
}

const drawMap = (level: number[][], entrance: { x: number, y: number }, exit: { x:number, y: number }, name: string, tileWidth: number) => {
    // const { width, height } = store.get(setting)

    // Create an invisible canvas
    let tempCanvas : HTMLCanvasElement | null = document.createElement('canvas')
    tempCanvas.width = level[0].length * map.tileWidth
    tempCanvas.height = level.length * tileWidth
    const ctx = tempCanvas.getContext('2d')

    // Load sprite sheet
    let spriteSheet : HTMLImageElement | null = new Image()
    spriteSheet.src = 'map/demo_tiles_test_48.png'

    spriteSheet.onload = async() => {
        // Draw the map of the level
        for(let i=0; i < level.length; i++){
            const row = level[i]
            for(let block=0; block < row.length; block++){
                ctx?.drawImage(
                    spriteSheet as HTMLImageElement, 
                    (row[block] % 2) === 0? 0 : tileWidth, 
                    row[block] > 1? (row[block] / 2) * tileWidth : 0, 
                    tileWidth, 
                    tileWidth, 
                    block * tileWidth, 
                    i * tileWidth, 
                    tileWidth, 
                    tileWidth
                )   
            }
        }

        // Convert the canvas to an image
        const tempImg = tempCanvas?.toDataURL()
        // console.log(tempImg)
        // Draw the image with kaplay
        if(tempImg){
            const mapAsset = loadSprite(name, tempImg)
            console.log('mapAsset', mapAsset)
        }
        // map.add([
        //     sprite(name),
        //     layer('bg'),
        //     pos(0, 0)
        // ])

        map.onDraw(() => {
            const { props } = getGameStoreValue()

            const enemies = get('enemy')

            drawSprite({
                sprite: name,
                pos: vec2(0, 0)
            })

            props.filter(prop => prop.type === 'pot').forEach(prop => {
                if(prop.broken){
                    drawSprite({
                        sprite: 'pot',
                        pos: vec2(prop.x * map.tileWidth, prop.y * map.tileWidth),
                        frame: 2
                    })
                }
            })

            enemies.forEach(enemy => {
                if(enemy.defeat && enemy.getCurAnim()?.name !== 'lose'){
                    drawSprite({
                        sprite: 'enemy',
                        pos: vec2(enemy.pos.x, enemy.pos.y),
                        frame: 13,
                        flipX: enemy.flipX,
                        anchor: 'center'
                    })
                }
            })             
        })

        tempCanvas = null
        spriteSheet = null

        // set collision for entrance and exit
        if(get('entrance').length){
            const door = get('entrance')[0]
            door.pos = vec2(entrance.x * tileWidth, entrance.y * tileWidth)
        }else{
            spawnObject(
                { x: entrance.x * tileWidth, y: entrance.y * tileWidth, type: 'entrance', roomId: -1 }, 
                tileWidth,
                new Rect(vec2(0), tileWidth, tileWidth),
            )            
        }

        if(get('exit').length){
            const door = get('exit')[0]
            door.pos = vec2(exit.x * tileWidth, exit.y * tileWidth)
        }else{
            spawnObject(
                { x: exit.x * tileWidth, y: exit.y * tileWidth, type: 'exit', roomId: -1 }, 
                tileWidth,
                new Rect(vec2(0), tileWidth, tileWidth),
            )            
        }

        // Set rects for collision around the rooms
        // Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Left_shift#using_left_shift
        getWallEdges(level, tileWidth).then(() => {
            setChunks().finally(() => {
                console.log('init player')
                try {
                    initPlayer(level, entrance, tileWidth)
                } catch (error) {
                    console.warn('init player error', error)   
                }
            })  
        })          
    }
}  

// Extract raw edges
const getWallEdges = async(grid: number[][], tileWidth: number) => {
    const topEdges: {x: number, y: number}[] = []
    const bottomEdges: {x: number, y: number}[] = []
    const rightEdges: {x: number, y: number}[] = []
    const leftEdges: {x: number, y: number}[] = []

    const h = grid.length
    const w = grid[0].length

    const walkable = [0, 3]

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // If the tile is a floor
            if (walkable.find(t => t === grid[y][x]) !== undefined) {
                // Check the 4 neighboring tiles
                // Top
                if(grid[y - 1] && grid[y - 1][x] === 1) topEdges.push({x, y: y -1})
                // Right
                if(grid[y][x + 1] && grid[y][x + 1] === 1) rightEdges.push({x: x + 1, y})
                // Bottom
                if(grid[y + 1] && grid[y + 1][x] === 1) bottomEdges.push({x, y: y + 1})
                // Left
                if(grid[y][x - 1] && grid[y][x - 1] === 1) leftEdges.push({x: x - 1, y})              
            }             
    }
  }

  // Remove the same tile if any
  const allEdges = [ topEdges, bottomEdges, rightEdges, leftEdges ]

  const walls = get('wall')
  let count = 0

  walls.forEach((wall) => {
    wall.onDestroy(() => console.log('Remove wall'))
  })

  // merge edges
  for(let i=0; i < allEdges.length; i++){
    const edgeList = allEdges[i]
    let anchor = 0

    switch(i){
        case 0: case 1: {
            // Top edges
            // Bottom edges
            for(let j=0; j < edgeList.length; j++){
                const { x, y } = edgeList[j]
                // If next edge is not in the same row or col
                if(edgeList[j + 1] === undefined ||
                  (edgeList[j + 1].x - edgeList[j].x) !== 1 || 
                   edgeList[j + 1].y !== y){

                    // Get the starting x
                    const startX = x - (j - anchor)
                    // Update anchor
                    anchor = j + 1

                    if(count < (walls.length - 1)){
                        walls[count].pos = vec2(startX * tileWidth, (i === 1)? y * tileWidth : (y * tileWidth) + (tileWidth - 4))
                        walls[count].area.shape.width = (x - startX + 1) * tileWidth
                        walls[count].area.shape.height = 4                 
                        count += 1
                    }else{
                        // Create rect
                        spawnObject(
                            { 
                                x: startX * tileWidth, 
                                y: (i === 1)? y * tileWidth : (y * tileWidth) + (tileWidth - 4), 
                                type: 'wall', 
                                roomId: -1 
                            }, 
                            tileWidth, 
                            new Rect(
                                vec2(0),
                                (x - startX + 1) * tileWidth, 4
                            )
                        )                          
                    }
                }
            }            
        }
        break;
        case 2: case 3: {
            // right edges
            // left edges       
            // Sort
            edgeList.sort((a, b) => {
                if(a.x !== b.x) return a.x- b.x
                return a.y - b.y              
            })              

            for(let j=0; j < edgeList.length; j++){
                const { x, y } = edgeList[j]
                // If next edge is not in the same col or col
                if(edgeList[j + 1] === undefined ||
                  (edgeList[j + 1].y - edgeList[j].y) !== 1 || 
                   edgeList[j + 1].x !== x){
                    // Get the starting x
                    const startY = anchor > 0? edgeList[anchor].y : edgeList[0].y
                    // Update anchor
                    anchor = j + 1

                    if(count < (walls.length - 1)){
                        walls[count].pos = vec2((i === 2)? x * tileWidth : (x * tileWidth) + (tileWidth - 4), startY * tileWidth)
                        walls[count].area.shape.width = 4
                        walls[count].area.shape.height = ((y - startY) + 1) * tileWidth
                        count += 1
                    }else{
                        // Create rect
                        spawnObject(
                            { 
                                x: (i === 2)? x * tileWidth : (x * tileWidth) + (tileWidth - 4), 
                                y: startY * tileWidth, 
                                type: 'wall', 
                                roomId: -1 
                            }, 
                            tileWidth, 
                            new Rect(
                                vec2(0),
                                4, ((y - startY) + 1) * tileWidth
                            )
                        )                        
                    }
                }
            }               
        }                  
        break;                     
    }
  }

    for(let i=count; i < walls.length; i++){
        walls[count].destroy()
    }
}

const setChunks = async() => {
    const { props, chunks } = getGameStoreValue()
    const { chunkSize } = store.get(setting)
    const copyChunks = JSON.parse(JSON.stringify(chunks))

    console.log('props', props)

    props.forEach(prop => {
        const tileToChunk = {
            x: Math.floor(prop.x / chunkSize ),
            y: Math.floor(prop.y / chunkSize )
        }

        const key = `${tileToChunk.x},${tileToChunk.y}`

        if(chunks[key] === undefined){
            copyChunks[key] = {
                x: tileToChunk.x,
                y: tileToChunk.y,
                props: [],
                active: false,
                objects: []
            }
        }

        copyChunks[key].props.push(prop)   
    })

    gameStore.set(gameState, prev => ({
        ...prev,
        chunks: copyChunks
    }))  
}

// const removeDuplicateEdges = (edgeList: {x: number, y: number}[], listToCheck: {x: number, y: number}[], listDirection: string, checkDirection: string) => {
//     const overlappingEdges: {x: number, y: number}[] = []

//     const filteredEdges = edgeList.filter((edge) => {
//         const duplicateIndex = listToCheck.findIndex((e) => e.x === edge.x && e.y === edge.y)
//         if(duplicateIndex >= 0){
//             listToCheck.splice(duplicateIndex, 1)
//             overlappingEdges.push(edge)
//         }else{
//             return edge
//         }
//     })

//     // console.log(`Overlapping edges between ${listDirection} and ${checkDirection}:`, overlappingEdges)

//     return { filteredEdges, listToCheck, overlappingEdges }
// }


const initPlayer = (grid: number[][], entrance: { x: number, y: number }, tileWidth: number) => {
    // Set Player starting position by examining entrance
    const { playerData } = getGameStoreValue()
    let x = 0, y =0

    if(grid[entrance.y][entrance.x - 1] !== 1) {
        x = entrance.x - 1
        y = entrance.y
         
    }else
    if(grid[entrance.y][entrance.x + 1] !== 1) {
        x = entrance.x + 1
        y = entrance.y
    }else
    if(grid[entrance.y - 1][entrance.x] !== 1) {
        x = entrance.x
        y = entrance.y - 1
    }else
    if(grid[entrance.y + 1][entrance.x] !== 1) {
        x = entrance.x
        y = entrance.y + 1    
    }

    if(Object.keys(playerData).length){
        const player = get('player')[0]
        player.pos = vec2(x * tileWidth + (tileWidth / 2), y * tileWidth + (tileWidth / 2))

        setCameraPosition(player, grid[0].length * tileWidth, grid.length * tileWidth)

        k.tween(
            1,
            0,
            0.3,
            (v) => { 
                k.usePostEffect("fadeTransition", () => ({ "u_progress": v }))
            },
            k.easings.easeInOutQuad
        ).onEnd(() => {
            // Enable control
            setData('ready', true)    
            player.enterState('active')
        })           
    }else{
        createPlayerSprite(map, x, y, grid[0].length * tileWidth, grid.length * tileWidth, null)
    }
}
