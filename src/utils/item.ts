import potData from '../data/pot.json'
import chestData from '../data/chest.json'
import potionData from '../data/potion.json'
import otherData from '../data/other.json'  
// import cardData from '../data/card.json'

import type { GameObj, Vec2 } from 'kaplay'
import k from '../lib/kaplay'
import { getGameStoreValue } from '../store/game'
import { getOptionValue } from '../store/setting'

const { 
    area,
    // bezier,
    easings,
    get,
    evaluateQuadratic,
    // evaluateBezier,
    // normalizedCurve,
    // loop,
    pos,
    rect,
    sprite,
    text,
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

export const dropItem = (obj: GameObj, type: string) => {
    const items = []
    const { 
        base 
    } = type === 'pot'? potData :
        type === 'chest'? chestData :
        // type === 'card'? cardData :
        { base: { count: { min: 1, max: 1 }, item: { gold: 0.5 }, gold: { min: 0, max: 0 } } }      
    
    // Decide how many items to drop
    const count = Math.floor(Math.random() * (base.count.max - base.count.min + 1)) + base.count.min

    // Dice roll
    const rng = Math.random()

    for(const [key, value] of Object.entries(base.item)){
        if(rng < value && items.length < count){
            switch(key){
                case 'gold':{
                    const goldAmount = Math.floor(Math.random() * (base.gold.max - base.gold.min + 1)) + base.gold.min
                    items.push({ name: 'gold', amount: goldAmount, frame: 0 })
                }
                break;
                case 'potion':{
                    // Randomly select a potion from potionData
                    const potionIndex = Math.floor(Math.random() * (potionData.length - 1))
                    const potion = potionData[potionIndex]
                    items.push({ name: 'potion', item: potion, frame: 1 })
                }
                break;
                case 'other':{
                    // Randomly select an other item from otherData
                    const otherIndex = Math.floor(Math.random() * (otherData.length - 1))
                    const other = otherData[otherIndex]
                    items.push({ name: 'other', item: other, frame: 2 })
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

    const { level } = getGameStoreValue()
    const { tileWidth } = getOptionValue()
    const map = get('map')[0]

    // Check the space around the obj to drop the item
    const range = obj.width
    const dropX = { start: obj.pos.x - range, end: obj.pos.x + obj.width + range } 
    const dropY = { start: obj.pos.y - range, end: obj.pos.y + obj.width + range }    
    
    const currentPos = {
        x: obj.pos.x / tileWidth,
        y: obj.pos.y / tileWidth
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

            } catch (error) {
                console.warn('item object create error', error)
            }
        }
    })    
}