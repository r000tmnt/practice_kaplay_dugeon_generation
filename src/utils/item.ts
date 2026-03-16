import potionData from '../data/potion.json'
import otherData from '../data/other.json'  
import cardData from '../data/card.json'
import headData from '../data/head.json'
import handData from '../data/hand.json'
import bodyData from '../data/body.json'
import feetData from '../data/feet.json'
import accessoryData from '../data/accessory.json'

import type { GameObj, Vec2 } from 'kaplay'
import k from '../lib/kaplay'
import { gameStore, getGameStoreValue, inventoryUI } from '../store/game'
import { getOptionValue } from '../store/setting'
import type { base, item } from '../model/item'
import { displayItemsInGrid } from '../components/inventory'

const { 
    area,
    // bezier,
    easings,
    get,
    evaluateQuadratic,
    // evaluateBezier,
    // normalizedCurve,
    // loop,
    onHover,
    onHoverEnd,
    pos,
    // rect,
    RNG,
    sprite,
    setData,
    // text,
    tween,
    vec2,
    // wait,
 } = k

const continuousTween = (sequence: Vec2[]|number[], obj: GameObj, target: string, duration: number, count=0) => {
    tween(
        obj[target],
        sequence[count],
        duration,
        (value) => {
            // console.log('time', count)
            // console.log('next', value)
            obj[target] = value
        },
        easings.linear
    ).onEnd(() => {
        if(count < (sequence.length - 1))
            continuousTween(
                sequence,
                obj,
                target,
                duration,
                count + 1
            )
    })
}

export const defineItemSprite = (key: string) => {
    switch(key){
        case 'gold':
            return { sprite: 'item', frame: 0 }

        case 'potion':
            return { sprite: 'item', frame: 1 }

        case 'other':
            return { sprite: 'item', frame: 2 }

        case 'card':
            return { sprite: 'item', frame: 5  }

        case 'head':
            return { sprite: 'equipment', frame: 1 }

        case 'body':
            return { sprite: 'equipment', frame: 2 }

        case 'hand':
            return { sprite: 'equipment', frame: 0 }

        case 'feet':
            return { sprite: 'equipment', frame: 3 }

        case 'accessory':
            return { sprite: 'equipment', frame: 4 }

        case 'ring':
            return { sprite: 'equipment', frame: 6 }

        default:
            return { sprite: 'item', frame: 0 }
    }    
}

export const prepareItemsToDrop = (obj: GameObj, base: base = { 
    count: { min: 1, max: 1 }, 
    item: { gold: 0.5 }, 
    gold: { min: 0, max: 0 } 
}) => {
    const items: { name: string, item: item, sprite: string, frame: number }[] = []
    
    // Decide how many items to drop
    const count = Math.floor(Math.random() * (base.count.max - base.count.min + 1)) + base.count.min

    // Dice roll
    const rng = new RNG(Date.now()).gen()

    for(const [key, value] of Object.entries(base.item)){
        if(rng < value && items.length < count){
            switch(key){
                case 'gold':{
                    const goldAmount = Math.floor(rng * (base.gold.max - base.gold.min + 1)) + base.gold.min
                    items.push({ name: 'gold', item: {
                        id: 'gold',
                        name: 'gold',
                        desc: "",
                        stackable: true,
                        quantity: goldAmount
                    }, ...defineItemSprite(key) })
                }
                break;
                case 'potion':{
                    // Randomly select a potion from potionData
                    const potionIndex = Math.floor(rng * potionData.length)
                    items.push({ name: 'potion', item: potionData[potionIndex], ...defineItemSprite(key) })
                }
                break;
                case 'other':{
                    // Randomly select an other item from otherData
                    const otherIndex = Math.floor(rng * otherData.length)
                    items.push({ name: 'other', item: otherData[otherIndex], ...defineItemSprite(key) })
                }
                break;
                case 'card':{
                    const cardIndex = Math.floor(rng * cardData.length)
                    items.push({ name: 'other', item: cardData[cardIndex], ...defineItemSprite(key) })
                }
                break;
                default:{
                    let equipment
                    switch(key){
                        case 'head':
                            equipment = headData[Math.floor(rng * headData.length)]
                        break;
                        case 'body':
                            equipment = bodyData[Math.floor(rng * bodyData.length)]
                        break;
                        case 'hand':
                            equipment = handData[Math.floor(rng * handData.length)]
                        break;
                        case 'feet':
                            equipment = feetData[Math.floor(rng * feetData.length)]
                        break;
                        case 'accessory':
                            equipment = accessoryData[Math.floor(rng * accessoryData.length)]
                        break;
                        case 'ring':
                            equipment = accessoryData[Math.floor(rng * accessoryData.length)]
                        break;
                    }
                    // TODO: Modify item     
                    
                    if(equipment) items.push({ name: key, item: equipment, ...defineItemSprite(key) })
                }              
                break;
            }
        }
    }

    dropItem(obj, items)
}

export const dropItem = (obj: GameObj, items: { name: string, item: item, sprite: string, frame: number }[]) => {
    const { level } = getGameStoreValue()
    const { tileWidth } = getOptionValue()
    const map = get('map')[0]

    // Check the space around the obj to drop the item
    const range = obj.width * 1.5
    const dropX = { start: obj.pos.x - range, end: obj.pos.x + range } 
    const dropY = { start: obj.pos.y - range, end: obj.pos.y + range }    
    
    const currentPos = {
        x: Math.floor(obj.pos.x / tileWidth),
        y: Math.floor(obj.pos.y / tileWidth)
    }

    console.log('currentPos', currentPos)

    // Top is blocked
    if(level[currentPos.y -1] && level[currentPos.y -1][currentPos.x] === 1) {
        dropY.start = obj.pos.y + (obj.width / 2)
    }

    // Down is blocked
    if(level[currentPos.y +1] && level[currentPos.y +1][currentPos.x] === 1){
        dropY.end = obj.pos.y - (obj.width / 2)
    }

    // Right is blocked
    if(level[currentPos.y][currentPos.x +1] && level[currentPos.y][currentPos.x +1] === 1){
        dropX.end =  obj.pos.x - (obj.width / 2)
    }

    // Left is blocked
    if(level[currentPos.y][currentPos.x -1] && level[currentPos.y][currentPos.x -1] === 1){
        dropX.start = obj.pos.x + (obj.width / 2)
    }

    items.forEach(item => {
        // Drop item logic here
        console.log('item:', item)
        const rng = Math.random()
        const x = Math.floor((rng * (dropX.end - dropX.start + 1))) + dropX.start
        const y = Math.floor((rng * (dropY.end - dropY.start + 1))) + dropY.start

        console.log('possible x and y', Math.floor(x / tileWidth), Math.floor(y / tileWidth))
        console.log(level[Math.floor(y / tileWidth)][Math.floor(x / tileWidth)])

        // If the tile is a floor
        if(level[Math.floor(y / tileWidth)] && level[Math.floor(y / tileWidth)][Math.floor(x / tileWidth)] === 0){
            try {
                // Create the item entity here
                const dropped = map.add([
                    sprite(item.sprite, { frame: item.frame }),
                    area(),
                    pos(obj.pos.x, obj.pos.y), // starting position
                    {
                        item: item.item
                    },
                    // tags
                    "item"
                ])

                // Get control point between start and finish
                const arcHeight = Math.floor(rng * (60 - 20) + 20)
                const lift = vec2(
                    // (dropX.end < obj.pos.x)?
                    // (dropped.pos.x - x) / 2 :
                    (dropped.pos.x + x) / 2, 
                    Math.min(dropped.pos.y, y) - arcHeight
                )

                console.log('dropped item', dropped)

                // Visual effect
                const points = 25
                const curvedPath = []

                for(let i=0; i < points; i++){
                    const t = i / points
                    curvedPath.push(
                        evaluateQuadratic(
                            dropped.pos,
                            lift,
                            vec2(x, y),
                            t
                        )
                    )
                }

                console.log('curvedPath', curvedPath)
                continuousTween(
                    curvedPath,
                    dropped,
                    'pos',
                    0.04,
                )                

                onHover('item', () => { setData('hovering', true) })

                onHoverEnd('item', () => { setData('hovering', false) })

                dropped.onClick(() => {
                    const player = get('player')[0]
                    const dist = dropped.pos.dist(player.pos)
                    
                    if(dist <= 50){
                        // Push item to inventory
                        if(item.name !== 'gold' && item.item !== undefined){
                            const { inventory } = getGameStoreValue()
                            let availableIndex = -1
                            let stacked = false

                            // If item is stackable
                            // Find the same item first
                            if(item.item.stackable){
                                const sameItem = inventory.space.findIndex(stored => stored?.item.id === item.item.id)

                                if(sameItem >= 0 && inventory.space[sameItem]){
                                    const { quantity, limit } = inventory.space[sameItem].item
                                    if(quantity && limit){
                                        if(quantity < limit){
                                            inventory.space[sameItem].item.quantity = quantity + 1
                                            stacked = true

                                            console.log('stacked item', inventory.space[sameItem])

                                            // Destroy item on the map
                                            dropped.destroy()
                                            gameStore.set(inventoryUI, inventory)                                            
                                        }
                                    }
                                }
                            }

                            if(stacked) return

                            for(let i=0; i < inventory.limit; i++){
                                if(!inventory.space[i] || inventory.space[i] === undefined){
                                    availableIndex = i
                                    inventory.space[i] = {
                                        index: i,
                                        item: item.item,
                                        frame: item.frame
                                    }

                                    console.log('added item to inventory', inventory.space)

                                    // If inventory is opened
                                    if(!inventory.hide){
                                        // Display pushed item
                                        const inventoryUI = get('ui')[0].get('inventory')[0]
                                        displayItemsInGrid(inventoryUI, tileWidth)
                                    }

                                    break
                                }
                            }
                            
                            if(availableIndex < 0){
                                // No more space
                            }else{
                                // Destroy item on the map
                                dropped.destroy()
                                gameStore.set(inventoryUI, inventory)
                            }                            
                        }else{
                            // Increase number of gold
                            const { inventory } = getGameStoreValue()
                            inventory.gold += item.item.quantity?? 0

                            // Destroy item on the map
                            dropped.destroy()                            
                            gameStore.set(inventoryUI, inventory)
                        }
                    }else{
                        // Find a path to the item
                        try {
                            player.path = player.navigateTo(dropped.worldPos)   
                        } catch (error) {
                            console.warn('player pathfinding error', error)
                        }
                    }
                })

            } catch (error) {
                console.warn('item object create error', error)
            }
        }
    })
}