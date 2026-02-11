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
            console.log('time', count)
            console.log('next', value)
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

export const prepareItemsToDrop = (obj: GameObj, base: base = { 
    count: { min: 1, max: 1 }, 
    item: { gold: 0.5 }, 
    gold: { min: 0, max: 0 } 
}) => {
    const items: { name: string, item: item, frame: number }[] = []
    
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
                    }, frame: 0 })
                }
                break;
                case 'potion':{
                    // Randomly select a potion from potionData
                    const potionIndex = Math.floor(rng * potionData.length)
                    items.push({ name: 'potion', item: potionData[potionIndex], frame: 1 })
                }
                break;
                case 'other':{
                    // Randomly select an other item from otherData
                    const otherIndex = Math.floor(rng * otherData.length)
                    items.push({ name: 'other', item: otherData[otherIndex], frame: 2 })
                }
                break;
                case 'card':{
                    const cardIndex = Math.floor(rng * cardData.length)
                    items.push({ name: 'other', item: cardData[cardIndex], frame: 0 })
                }
                break;
                default:{
                    let equipment
                    let frame = 0
                    switch(key){
                        case 'head':
                            equipment = headData[Math.floor(rng * headData.length)]
                            frame = 1
                        break;
                        case 'body':
                            equipment = bodyData[Math.floor(rng * bodyData.length)]
                            frame = 2
                        break;
                        case 'hand':
                            equipment = handData[Math.floor(rng * handData.length)]
                        break;
                        case 'feet':
                            equipment = feetData[Math.floor(rng * feetData.length)]
                            frame = 3
                        break;
                        case 'accessory':
                            equipment = accessoryData[Math.floor(rng * accessoryData.length)]
                            frame = 4
                        break;
                        case 'ring':
                            equipment = accessoryData[Math.floor(rng * accessoryData.length)]
                            frame = 6
                        break;
                    }
                    // TODO: Modify item     
                    
                    if(equipment) items.push({ name: key, item: equipment, frame })
                }              
                break;
                // case 'card':{
                //     // Randomly select a card from cardData
                //     const cardIndex = Math.floor(Math.random() * (cardData.length - 1))
                //     const card = cardData[cardIndex]
                //     items.push({ name: 'card', item: card })                        
                // }
                // break;
            }
        }
    }

    dropItem(obj, items)
}

export const dropItem = (obj: GameObj, items: { name: string, item: item, frame: number }[]) => {
    const { level } = getGameStoreValue()
    const { tileWidth } = getOptionValue()
    const map = get('map')[0]

    // Check the space around the obj to drop the item
    const range = obj.width
    const dropX = { start: obj.pos.x - range, end: obj.pos.x + obj.width + range } 
    const dropY = { start: obj.pos.y - range, end: obj.pos.y + obj.width + range }    
    
    const currentPos = {
        x: Math.floor(obj.pos.x / tileWidth),
        y: Math.floor(obj.pos.y / tileWidth)
    }

    // Top
    if(level[currentPos.y -1] && level[currentPos.y -1][currentPos.x] === 1) {
        dropY.start = obj.pos.y + obj.width
        dropY.end = obj.pos.y + obj.width + range
    }

    // Down
    if(level[currentPos.y +1] && level[currentPos.y +1][currentPos.x] === 1){
        dropY.start =  obj.pos.y - obj.width
        dropY.end = obj.pos.y - (obj.width + range)
    }
    // Right
    if(level[currentPos.y][currentPos.x +1] && level[currentPos.y][currentPos.x +1] === 1){
        dropX.start =  obj.pos.x
        dropX.end = obj.pos.x - (obj.width + range)            
    }
    // Left
    if(level[currentPos.y][currentPos.x -1] && level[currentPos.y][currentPos.x -1] === 1){
        dropX.start =  obj.pos.x + obj.width
        dropX.end = obj.pos.x + obj.width + range
    }

    items.forEach(item => {
        // Drop item logic here
        console.log('item:', item)

        const x = Math.floor(Math.random() * (dropX.end - dropX.start) + dropX.start) 
        const y = Math.floor(Math.random() * (dropY.end - dropY.start) + dropY.start)

        console.log('possible x and y', x, y)

        // If the tile is a floor
        if(level[Math.floor(y / tileWidth)] && level[Math.floor(y / tileWidth)][Math.floor(x / tileWidth)] === 0){
            try {
                // Create the item entity here
                const dropped = map.add([
                    sprite('item', { frame: item.frame }),
                    area(),
                    pos(obj.pos.x, obj.pos.y),
                    {
                        item: item.item
                    },
                    // tags
                    "item"
                ])

                // Get control point between start and finish
                const arcHeight = Math.floor(Math.random() * (60 - 20) + 20)
                const lift = vec2((dropped.pos.x + x) / 2, Math.min(dropped.pos.y, y) - arcHeight)

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
                                const sameItem = inventory.space.findIndex(stored => stored.item.id === item.item.id)

                                if(sameItem >= 0){
                                    const { quantity, limit } = inventory.space[sameItem].item
                                    if(quantity && limit){
                                        if(quantity < limit){
                                            inventory.space[sameItem].item.quantity = quantity + 1
                                            stacked = true

                                            // Destory item on the map
                                            dropped.destroy()
                                            gameStore.set(inventoryUI, inventory)                                            
                                        }
                                    }
                                }
                            }

                            if(stacked) return

                            for(let i=0; i < inventory.limit; i++){
                                if(inventory.space[i] === undefined){
                                    availableIndex = i
                                    inventory.space.push({
                                        index: i,
                                        item: item.item,
                                        frame: item.frame
                                    })

                                    // Sort by index
                                    inventory.space.sort((a, b) => a.index - b.index)

                                    // If inventory is opened
                                    if(inventory.open){
                                        // Display pushed item
                                        const inventoruUI = map.get('ui')[0].get('inventory')[0]
                                        displayItemsInGrid(inventoruUI, tileWidth)
                                    }

                                    break
                                }
                            }
                            
                            if(availableIndex < 0){
                                // No more space
                            }else{
                                // Destory item on the map
                                dropped.destroy()
                                gameStore.set(inventoryUI, inventory)
                            }                            
                        }else{
                            // Increase number of gold
                            const { inventory } = getGameStoreValue()
                            inventory.gold += item.item.quantity?? 0

                            // Destory item on the map
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