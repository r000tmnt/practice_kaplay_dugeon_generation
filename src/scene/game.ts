import k from '../lib/kaplay'
import { type GameObj, type Vec2 } from 'kaplay';
import { generateBSPDungeon } from '../utils/bspDungeonGenerator';
import { createPlayerSprite } from '../utils/player';

// Store
import { createStore } from 'jotai'
import { gameState } from '../store/game';
import { setting } from '../store/setting';
import type { room } from '../model/map';
const store = createStore()

const { 
    add,
    area,
    body,
    color,
    go,
    getLayers,
    layer,
    loadSprite,
    opacity,
    pos,
    Polygon,
    polygon,
    Rect,
    rect,
    rotate,
    setLayers,
    setData,
    setCamPos,
    scene,
    sprite,
    vec2,
} = k

let map : GameObj = {} as GameObj

export default function initGame(){
    // Define layers
    const layers = getLayers()
    if(!layers) setLayers(['bg', 'game', "fg"], "game")    

    scene('game', async(map = null) => {
        // loadSprite('testMap', '', {
        //     sliceX: 2,
        //     sliceY: 2
        // })

        loadSprite('player', 'player/demo_player_idle.png', {
            sliceX: 3,
            sliceY: 3,
            anims: {
                walk: { from: 3, to: 5, loop: true }
            }
        })

        setData('ready', false)
        setMap()
    })

    go('game')    
}

const setMap = async(index = 0, name = 'testMap') => {
    const {level} = store.get(gameState)
    const { tileWidth } = store.get(setting)

    map = add([pos(0, 0), opacity(1), "map", { tileWidth }],)

    // setCamPos(map.pos.x + ((tileWidth * 16) / 2), map.pos.y + ((tileWidth * 9) / 2))

    // If level exist
    if(level[index]){
        // Get the rooms
        const { rooms, entrances } = store.get(gameState)

        const entrance = entrances[index]

        // const exit = exits[index]

        // Draw map
        drawMap(level[index], rooms[index], name, tileWidth)

        initPlayer(level[index], entrance as { x: number, y: number }, tileWidth)        
    }else{
        // Generate the map
        const { grid, rooms, entrance, exit } = await generateBSPDungeon();

        console.log(entrance, exit)

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

        store.set(gameState, prev => ({
            ...prev,
            level: prev.level.concat([grid]),
            rooms: prev.rooms.concat([rooms]),
            entrances: prev.entrances.toSpliced(index, 0, entrance),
            exits: prev.exits.toSpliced(index, 0, exit)
        }))

        const {level} = store.get(gameState)
        drawMap(level[index], rooms, name, tileWidth)
        initPlayer(grid, entrance as { x: number, y: number }, tileWidth)
    }
}

const drawMap = (level: number[][], rooms: room[], name: string, tileWidth: number) => {
    // const { width, height } = store.get(setting)

    // Create an invisible canvas
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = level[0].length * map.tileWidth
    tempCanvas.height = level.length * tileWidth
    const ctx = tempCanvas.getContext('2d')

    // Load sprite sheet
    const spriteSheet = new Image()
    spriteSheet.src = 'map/demo_tiles_test_48.png'

    spriteSheet.onload = () => {
        // Draw the map of the level
        for(let i=0; i < level.length; i++){
            const row = level[i]
            for(let block=0; block < row.length; block++){
                switch(row[block]){
                    case 0:
                    break;
                    case 1: case 2:
                        ctx?.drawImage(
                            spriteSheet, 
                            (row[block] % 2) === 0? 0 : tileWidth, 
                            row[block] > 1? (row[block] / 2) * tileWidth : 0, 
                            tileWidth, 
                            tileWidth, 
                            block * tileWidth, 
                            i * tileWidth, 
                            tileWidth, 
                            tileWidth
                        )
                    break;
                }
            }
        }

        // Conver the canvas to an image
        const tempImg = tempCanvas.toDataURL()
        console.log(tempImg)
        // Draw the image with kaplay
        loadSprite(name, tempImg)
        map.add([
            sprite(name),
            layer('bg'),
            pos(0, 0)
        ])

        tempCanvas.remove()
        spriteSheet.remove()

        // Set rects for collision around the rooms
        // Refernce: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Left_shift#using_left_shift
        getWallEdges(level, tileWidth)   
        setChunks()          
    }
}  

// Extract raw edges
const getWallEdges = (grid: number[][], tileWidth: number) => {
    const topEdges: {x: number, y: number}[] = []
    const bottomEdges: {x: number, y: number}[] = []
    const rightEdges: {x: number, y: number}[] = []
    const leftEdges: {x: number, y: number}[] = []

    const h = grid.length
    const w = grid[0].length

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // If the tile is a floor
            if (grid[y][x] === 0) {
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

  // merge edges
  for(let i=0; i < allEdges.length; i++){
    const edgeList = allEdges[i]
    let anchor = 0

    switch(i){
        case 0:{
            // Top edges
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

                    // Create rect
                    map.add([
                        pos(startX * tileWidth, (y * tileWidth) + (tileWidth - 8)),
                        area({ shape: new Rect(
                            vec2(0),
                            (x - startX + 1) * tileWidth, 8
                        )}),
                        body({ isStatic: true }),
                        // opacity(0.5), // debug
                        // color(0, 0, 255),
                        "wall",                        
                    ])
                }
            }            
        }
        break;
        case 1:{
            // bottom edges
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

                    // Create rect
                    map.add([
                        pos(startX * tileWidth, y * tileWidth),
                        area({ shape: new Rect(
                            vec2(0),
                            (x - startX + 1) * tileWidth, 8
                        ) }),
                        body({ isStatic: true }),
                        // opacity(0.5), // debug
                        // color(0, 0, 255),
                        "wall",                        
                    ])                        
                }
            }                
        }        
        break;
        case 2:{
            // right edges
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
                    // Create rect
                    map.add([
                        pos(x * tileWidth, startY * tileWidth),
                        area({ shape: new Rect(
                            vec2(0),
                            8, ((y - startY) + 1) * tileWidth
                        ) }),
                        body({ isStatic: true }),
                        // opacity(0.5), // debug
                        // color(0, 0, 255),
                        "wall",                        
                    ])
                }
            }               
        }                  
        break;
        case 3:{
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
                    // Create rect
                    map.add([
                        pos((x * tileWidth) + (tileWidth - 8), startY * tileWidth),
                        area({ shape:new Rect(
                            vec2(0),
                            8, ((y - startY) + 1) * tileWidth
                        ) }),
                        body({ isStatic: true }),
                        // opacity(0.5), // debug
                        // color(0, 0, 255),
                        "wall",                        
                    ])
                }
            }               
        }             
        break;                        
    }
  }

  console.log(allEdges[0])
  console.log(allEdges[1])
  console.log(allEdges[2])
  console.log(allEdges[3])
}

const setChunks = () => {
    const { props, chunks } = store.get(gameState)
    const { chunkSize, tileWidth } = store.get(setting)

    props.forEach(prop => {
        const tileToChunk = {
            x: Math.floor((prop.x * tileWidth) / chunkSize ),
            y: Math.floor((prop.y * tileWidth) / chunkSize )
        }

        const key = `${tileToChunk.x},${tileToChunk.y}`

        const copyMap = new Map(chunks)

        if(!chunks.has(key)){
            copyMap.set(key, {
                x: tileToChunk.x,
                y: tileToChunk.y,
                props: [],
                active: false,
                objects: []
            })

            store.set(gameState, prev => ({
                ...prev,
                chunks: copyMap
            }))
        }

        copyMap.get(key)?.props.push(prop)

        store.set(gameState, prev => ({
            ...prev,
            chunks: copyMap
        }))        
    })
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
    // Set Player starting position by examing entrance
    if(entrance && grid[entrance.y][entrance.x - 1] === 0) {
        createPlayerSprite(map, entrance.x - 1, entrance.y, grid[0].length * tileWidth, grid.length * tileWidth)    
    }else
    if(entrance && grid[entrance.y][entrance.x + 1] === 0) {
        createPlayerSprite(map, entrance.x + 1, entrance.y, grid[0].length * tileWidth, grid.length * tileWidth)    
    }else
    if(entrance && grid[entrance.y - 1][entrance.x] === 0) {
        createPlayerSprite(map, entrance.x, entrance.y - 1, grid[0].length * tileWidth, grid.length * tileWidth)    
    }else
    if(entrance && grid[entrance.y + 1][entrance.x] === 0) {
        createPlayerSprite(map, entrance.x, entrance.y + 1, grid[0].length * tileWidth, grid.length * tileWidth)    
    }
}
