import k from '../lib/kaplay'
import { type GameObj } from 'kaplay';
import { generateBSPDungeon } from '../utils/bspDungeonGenerator';
import { createPlayerSprite } from '../utils/player';
import { spawnObject } from '../utils/staticObject';

// Store
import { createStore } from 'jotai'
import { gameState, gameStore, getGameStoreValue } from '../store/game';
import { setting } from '../store/setting';
// import type { room } from '../model/map';
const store = createStore()

store.sub(gameState, () => {
    const newValue = store.get(gameState)
    console.log('newValue ', newValue)
})

const { 
    add,
    drawSprite,
    go,
    getLayers,
    loadSprite,
    loadSpriteAtlas,
    opacity,
    pos,
    Rect,
    setLayers,
    setData,
    scene,
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

        // loadSpriteAtlas('player/demo_player_spritesheet.png', 'player/demo_player_spritesheet.json')
        loadSpriteAtlas('player/demo_player_68x68_alter.png', 'player/demo_player_spritesheet.json')
        loadSpriteAtlas('enemy/demo_enemy_spritesheet.png', 'enemy/demo_enemy_spritesheet.json')

        loadSprite('pot', 'map/demo_pot_16x16.png', {
            sliceX: 2,
            sliceY: 2,
            anims: {
                break: { from: 1, to: 2, loop: false }
            }
        })        

        loadSprite('item', 'map/demo_item.png', {
            sliceX: 5,
            anims: {
                open: { from: 3, to: 4, loop: false }
            }
        })

        loadSprite('shrine', 'map/shrine.png', {
            sliceX: 2,
        })        

        setData('ready', false)
        setMap()
    })

    go('game')    
}

const setMap = async(name = 'testMap') => {
    const {level} = store.get(gameState)
    const { tileWidth } = store.get(setting)

    map = add([pos(0, 0), opacity(1), "map", { tileWidth }])

    // setCamPos(map.pos.x + ((tileWidth * 16) / 2), map.pos.y + ((tileWidth * 9) / 2))

    // If level exist
    if(level.length){
        // Get the rooms
        const { entrance, exit } = store.get(gameState)

        if(entrance) level[entrance.y][entrance.x] = 2

        if(exit) level[exit.y][exit.x] = 2

        // Draw map
        drawMap(level, entrance, name, tileWidth)

        initPlayer(level, entrance as { x: number, y: number }, tileWidth)        
    }else{
        // Generate the map
        const dungeon = await generateBSPDungeon();

        if(dungeon){
            const { grid, entrance, exit } = dungeon

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

            const {level} = getGameStoreValue()
            drawMap(level, entrance as { x: number, y: number }, exit as { x: number, y: number }, name, tileWidth)            
        }
    }
}

const drawMap = (level: number[][], entrance: { x: number, y: number }, exit: { x:number, y: number }, name: string, tileWidth: number) => {
    // const { width, height } = store.get(setting)

    // Create an invisible canvas
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = level[0].length * map.tileWidth
    tempCanvas.height = level.length * tileWidth
    const ctx = tempCanvas.getContext('2d')

    // Load sprite sheet
    const spriteSheet = new Image()
    spriteSheet.src = 'map/demo_tiles_test_48.png'

    spriteSheet.onload = async() => {
        // Draw the map of the level
        for(let i=0; i < level.length; i++){
            const row = level[i]
            for(let block=0; block < row.length; block++){
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
            }
        }

        // Conver the canvas to an image
        const tempImg = tempCanvas.toDataURL()
        console.log(tempImg)
        // Draw the image with kaplay
        loadSprite(name, tempImg)
        // map.add([
        //     sprite(name),
        //     layer('bg'),
        //     pos(0, 0)
        // ])

        map.onDraw(() => {
            const { props, enemies } = getGameStoreValue()

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
                if(enemy.defeat){
                    drawSprite({
                        sprite: 'enemy',
                        pos: vec2(enemy.x, enemy.y),
                        frame: 13,
                        flipX: enemy.flipX
                    })
                }
            })                 
        })

        tempCanvas.remove()
        spriteSheet.remove()

        // set collision for entrance and exit
        spawnObject(
            { x: entrance.x * tileWidth, y: entrance.y * tileWidth, type: 'entrance', roomId: -1 }, 
            tileWidth,
            new Rect(vec2(0), tileWidth, tileWidth),
        )

        spawnObject(
            { x: exit.x * tileWidth, y: exit.y * tileWidth, type: 'exit', roomId: -1 }, 
            tileWidth,
            new Rect(vec2(0), tileWidth, tileWidth),
        )

        // Set rects for collision around the rooms
        // Refernce: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Left_shift#using_left_shift
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
                    
                    // Create rect
                    spawnObject(
                        { 
                            x: startX * tileWidth, 
                            y: (i === 1)? y * tileWidth : (y * tileWidth) + (tileWidth - 1), 
                            type: 'wall', 
                            roomId: -1 
                        }, 
                        tileWidth, 
                        new Rect(
                            vec2(0),
                            (x - startX + 1) * tileWidth, 1
                        )
                    )  
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
                    
                    // Create rect
                    spawnObject(
                        { 
                            x: (i === 2)? x * tileWidth : (x * tileWidth) + (tileWidth - 1), 
                            y: startY * tileWidth, 
                            type: 'wall', 
                            roomId: -1 
                        }, 
                        tileWidth, 
                        new Rect(
                            vec2(0),
                            1, ((y - startY) + 1) * tileWidth
                        )
                    )    
                }
            }               
        }                  
        break;                     
    }
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
    // Set Player starting position by examing entrance
    if(entrance && grid[entrance.y][entrance.x - 1] !== 1) {
        createPlayerSprite(map, entrance.x - 1, entrance.y, grid[0].length * tileWidth, grid.length * tileWidth)    
    }else
    if(entrance && grid[entrance.y][entrance.x + 1] !== 1) {
        createPlayerSprite(map, entrance.x + 1, entrance.y, grid[0].length * tileWidth, grid.length * tileWidth)    
    }else
    if(entrance && grid[entrance.y - 1][entrance.x] !== 1) {
        createPlayerSprite(map, entrance.x, entrance.y - 1, grid[0].length * tileWidth, grid.length * tileWidth)    
    }else
    if(entrance && grid[entrance.y + 1][entrance.x] !== 1) {
        createPlayerSprite(map, entrance.x, entrance.y + 1, grid[0].length * tileWidth, grid.length * tileWidth)    
    }
}
