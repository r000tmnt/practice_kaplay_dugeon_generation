import type { GameObj, Vec2 } from "kaplay";
import k from "../lib/kaplay";
import { getOptionValue } from "../store/setting";
import { gameStore, getGameStoreValue, inventoryUI } from "../store/game";
import type { pickableItem, note, EquipField } from '../model/item'
import { dropItem } from "./item";
import type { inventoryRange } from '../model/UI'
import { equipItem } from './player'

const {
    area,
    anchor,
    // circle,
    color,
    // drawCurve,
    drawCircle,
    drawPolygon,
    drawText,
    drawRect,
    drawLine,
    drawSprite,
    // easings,
    // evaluateBezier,
    fixed,
    get,
    // getData,
    // Line,
    layer,
    mousePos,
    outline,
    // polygon,
    pos,
    Rect,
    rect,
    readd,
    rgb,
    sprite,
    // stay,
    text,
    // tween,
    vec2,
} = k

let curDraggin : GameObj |null = null

const equipFields: EquipField[] = ['head', 'body', 'feet', 'accessory1', 'rightHand', 'leftHand', 'accessory2', 'ring' ]

const range = {
    top: 0,
    down: 0,
    left: 0,
    right: 0,
    equip: {
        head: {
            top: 0,
            down: 0,
            left: 0,
            right: 0,            
        },
        body: {
            top: 0,
            down: 0,
            left: 0,
            right: 0,
        },
        feet: {
            top: 0,
            down: 0,
            left: 0,
            right: 0,
        },
        accessory1: {
            top: 0,
            down: 0,
            left: 0,
            right: 0,
        },
        rightHand: {
            top: 0,
            down: 0,
            left: 0,
            right: 0,
        },
        leftHand: {
            top: 0,
            down: 0,
            left: 0,
            right: 0,
        },
        accessory2: {
            top: 0,
            down: 0,
            left: 0,
            right: 0,
        },
        ring: {
            top: 0,
            down: 0,
            left: 0,
            right: 0,
        },
    },
    items: {
        top: 0,
        down: 0,
        left: 0,
        right: 0,
    }
}

// #region Utils
const arcPoint = (t: number, radius: number) => {
    const angle = t * Math.PI * 2

    return vec2(Math.cos(angle) * radius, Math.sin(angle) * radius)    
}

// Custom drag component
// Reference: https://play.kaplayjs.com/?example=drag
const drag = (self: GameObj) => {
    let offset = vec2(0)

    return {
        // Name of the component
        id: "drag",
        // This component requires the "pos" and "area" component to work
        require: ["pos", "area"],
        pick() {
            // Set the current global dragged object to this
            curDraggin = self;
            offset = mousePos().sub(self.pos);
            self.trigger("drag");
        },
        // "update" is a lifecycle method gets called every frame the obj is in scene
        update() {
            if (curDraggin === self) {
                self.pos = mousePos().sub(offset);
                self.trigger("dragUpdate");
            }
        },
        onDrag(action: () => void) {
            return self.on("drag", action);
        },
        onDragUpdate(action: () => void) {
            return self.on("dragUpdate", action);
        },
        onDragEnd(action: () => void) {
            return self.on("dragEnd", action);
        },
    }
}

const isPickable = (obj: unknown): obj is pickableItem => {
    const result = 
        typeof obj === 'object' && 
        obj !== null && 
        'pick' in obj && 
        typeof (obj as any).pick === 'function' && 
        'onDrag' in obj &&
        typeof (obj as any).onDrag === 'function' &&
        'onDragUpdate' in obj &&
        typeof (obj as any).onDragUpdate === 'function';  
        
    return result
}

const setRangeData = (inventory: GameObj, tileWidth: number) => {
    const { width, height, itemRow, itemCol } = inventory
    const itemWindowCenter = vec2(inventory.pos.x, inventory.pos.y + (height / 4))    

    range.top = inventory.pos.y - (height / 2)
    range.down = inventory.pos.y + (height / 2)
    range.left = inventory.pos.x - (width / 2)
    range.right = inventory.pos.x + (width / 2)

    equipFields.forEach((field, i) => {
        const index = (i + 1) > (equipFields.length / 2)? i - (equipFields.length / 2) : i
        const offset = -0.5 + (1.5 * index)
        range.equip[field].top = inventory.pos.y + ((itemRow - offset) * tileWidth)
        range.equip[field].down = inventory.pos.y - (itemRow - ((offset - 1) * tileWidth))
        range.equip[field].left = inventory.pos.x - (((itemCol / 2) * tileWidth) + (tileWidth / 2))
        range.equip[field].right = inventory.pos.x -(((itemCol / 2) * tileWidth) + (tileWidth * 1.5))
    })

    range.items.top = itemWindowCenter.y - ((itemRow / 2) * tileWidth) - (tileWidth / 2)
    range.items.down = itemWindowCenter.y + ((itemRow / 2) * tileWidth) + (tileWidth / 2)
    range.items.left = itemWindowCenter.x - ((itemCol / 2) * tileWidth) - (tileWidth / 2)
    range.items.right = itemWindowCenter.x + ((itemCol / 2) * tileWidth) + (tileWidth / 2)

    // const range = {
    //     top: inventory.pos.y - (height / 2),
    //     down: inventory.pos.y + (height / 2),
    //     left: inventory.pos.x - (width / 2),
    //     right: inventory.pos.x + (width / 2),
    //     equip: {
    //         head: {
    //             top: inventory.pos.y - ((itemRow - 0.5) * tileWidth),
    //             down: inventory.pos.y - ((itemRow - 1.5) * tileWidth),
    //             left: inventory.pos.x - (((itemCol / 2) * tileWidth) + (tileWidth / 2)),
    //             right: inventory.pos.x -(((itemCol / 2) * tileWidth) + (tileWidth * 1.5))
    //         },
    //         body: {
    //             top: inventory.pos.y - ((itemRow - 2) * tileWidth),
    //             down: inventory.pos.y - ((itemRow - 1) * tileWidth),
    //             left: inventory.pos.x - (((itemCol / 2) * tileWidth) + (tileWidth / 2)),
    //             right: inventory.pos.x - (((itemCol / 2) * tileWidth) + (tileWidth * 1.5))
    //         },
    //         feet: {
    //             top: inventory.pos.y - ((itemRow - 3.5) * tileWidth),
    //             down: inventory.pos.y - ((itemRow - 2.5) * tileWidth),
    //             left: inventory.pos.x - (((itemCol / 2) * tileWidth) + (tileWidth / 2)),
    //             right: inventory.pos.x - (((itemCol / 2) * tileWidth) + (tileWidth * 1.5))
    //         },
    //         accessory1: {
    //             top: inventory.pos.y - ((itemRow - 5) * tileWidth),
    //             down: inventory.pos.y - ((itemRow - 4) * tileWidth),
    //             left: inventory.pos.x - (((itemCol / 2) * tileWidth) + (tileWidth / 2)),
    //             right: inventory.pos.x - (((itemCol / 2) * tileWidth) + (tileWidth * 1.5))
    //         },
    //         rightHand: {
    //             top: inventory.pos.y - ((itemRow - 0.5) * tileWidth),
    //             down: inventory.pos.y - ((itemRow - 1.5) * tileWidth),
    //             left: inventory.pos.x - (tileWidth + (tileWidth / 2)),
    //             right: inventory.pos.x - (tileWidth + (tileWidth * 1.5))
    //         },
    //         leftHand: {
    //             top: inventory.pos.y - ((itemRow - 2) * tileWidth),
    //             down: inventory.pos.y - ((itemRow - 1) * tileWidth),
    //             left: inventory.pos.x - (tileWidth + (tileWidth / 2)),
    //             right: inventory.pos.x - (tileWidth + (tileWidth * 1.5))
    //         },
    //         accessory2: {
    //             top: inventory.pos.y - ((itemRow - 3.5) * tileWidth),
    //             down: inventory.pos.y - ((itemRow - 2.5) * tileWidth),
    //             left: inventory.pos.x - (tileWidth + (tileWidth / 2)),
    //             right: inventory.pos.x - (tileWidth + (tileWidth * 1.5))
    //         },
    //         ring: {
    //             top: inventory.pos.y - ((itemRow - 5) * tileWidth),
    //             down: inventory.pos.y - ((itemRow - 4) * tileWidth),
    //             left: inventory.pos.x - (tileWidth + (tileWidth / 2)),
    //             right: inventory.pos.y - (tileWidth + (tileWidth * 1.5))
    //         },
    //     },
    //     items: {
    //         top: itemWindowCenter.y - ((itemRow / 2) * tileWidth) - (tileWidth / 2),
    //         down: itemWindowCenter.y + ((itemRow / 2) * tileWidth) + (tileWidth / 2),
    //         left: itemWindowCenter.x - ((itemCol / 2) * tileWidth) - (tileWidth / 2),
    //         right: itemWindowCenter.x + ((itemCol / 2) * tileWidth) + (tileWidth / 2),
    //     }
    // }
}

export const displayItemsInGrid = (inventory:GameObj, tileWidth: number) => {
    // Get pages
    // const page = Math.floor(getGameStoreValue().inventory.limit / (itemRow * itemCol))
    const space = getGameStoreValue().inventory.space 
    const spawnedItems = inventory.get('item')
    const { height, itemRow, itemCol } = inventory
    const player = get('player')[0]

    for(let row=0; row < itemRow; row++){
        for(let col=0; col < itemCol; col++){
            // If item exist
            const block = col + (itemCol * row)
            if(space[block] !== undefined){
                // if(spawnedItems[block] !== undefined){
                //     // Change sprite and item
                //     spawnedItems[block].sprite = "item"
                //     spawnedItems[block].frame = space[block].frame
                //     spawnedItems[block].item = space[block].item
                //     spawnedItems[block].item.index = block
                // }else

                // TODO: If item took the space alreay
                const placedItem = spawnedItems.find(item => item.index === block)
                if(placedItem){
                    if(
                        placedItem.item.id !== space[block].item.id ||
                        !placedItem.item.stackable
                    ){
                        // Find the available block
                        for(let i=0; i < (itemCol * itemRow); i++){
                            if(spawnedItems.find(item => item.index === i) === undefined){
                                const newRow = i / itemRow
                                const newCol = i % itemRow

                                const spawn = {
                                    x: // If index point to the center col
                                        (newCol + 1) >= (itemCol / 2)?
                                        // ((col - halfCol) * tileWidth) - (halfTile)                  
                                        (((newCol + 1) - (itemCol / 2)) * tileWidth) - (tileWidth / 2):
                                        // relativeX - ((halfCol - col) * tileWodth) + (halfTile)
                                        0 - (((itemCol / 2) - newCol) * tileWidth) + (tileWidth / 2),
                                    y: // If index point to the center row
                                        ((newRow + 1) >= (itemRow / 2))?
                                        // relativeY + ((row - halfRow) * tileWidth) - (halfTile)
                                        (height / 4) + (((newRow + 1) - (itemRow / 2)) * tileWidth) - (tileWidth / 2):
                                        // relativeY - ((halfRow - row) * tileWidth) - (halfTile)
                                        (height / 4) - ((((itemRow / 2) - newRow) * tileWidth) - (tileWidth / 2)),   
                                }    

                                space[block].index = i

                                // Add sprite
                                placeItemInGrid(
                                    inventory,
                                    i,
                                    space[block],
                                    spawn,
                                    tileWidth,
                                    spawnedItems
                                )                                
                                                            
                                break
                            }
                        }                        
                    }

                    if(spawnedItems[block].item.stackable && placedItem.item.id === space[block].item.id){
                        spawnedItems[block].item.quantity += 1
                        // Remove item in gameStore
                        const storedInventory = getGameStoreValue().inventory
                        storedInventory.space.splice(block, 1)
                        // Update store
                        gameStore.set(inventoryUI, storedInventory)
                    }
                }else{
                    const spawn = {
                        x: // If index point to the center col
                            (col + 1) >= (itemCol / 2)?
                            // ((col - halfCol) * tileWidth) - (halfTile)                  
                            (((col + 1) - (itemCol / 2)) * tileWidth) - (tileWidth / 2):
                            // relativeX - ((halfCol - col) * tileWodth) + (halfTile)
                            0 - (((itemCol / 2) - col) * tileWidth) + (tileWidth / 2),
                        y: // If index point to the center row
                            ((row + 1) >= (itemRow / 2))?
                            // relativeY + ((row - halfRow) * tileWidth) - (halfTile)
                            (height / 4) + (((row + 1) - (itemRow / 2)) * tileWidth) - (tileWidth / 2):
                            // relativeY - ((halfRow - row) * tileWidth) - (halfTile)
                            (height / 4) - ((((itemRow / 2) - row) * tileWidth) - (tileWidth / 2)),   
                    }

                    // Add sprite
                    placeItemInGrid(
                        inventory,
                        space[block].index,
                        space[block],
                        spawn,
                        tileWidth,
                        spawnedItems
                    )
                }

                // drawSprite({
                //     sprite: "item",
                //     pos: vec2(
                //         // If index point to the center col
                //         (col + 1) >= (itemCol / 2)?               
                //         // ((col - halfCol) * tileWidth) - (halfTile)                  
                //         (((col + 1) - (itemCol / 2)) * tileWidth) - (tileWidth / 2):
                //         // relativeX - ((halfCol - col) * tileWodth) + (halfTile)
                //         0 - (((itemCol / 2) - (col)) * tileWidth) + (tileWidth / 2), 
                //         // If index point to the center row
                //         ((row + 1) >= (itemRow / 2))?
                //         // relativeY + ((row - halfRow) * tileWidth) - (halfTile)
                //         (inventoryHeight / 4) + (((row + 1) - (itemRow / 2)) * tileWidth) - (tileWidth / 2):
                //         // relativeY - ((halfRow - row) * tileWidth) - (halfTile)
                //         (inventoryHeight / 4) - ((((itemRow / 2) - (row)) * tileWidth) - (tileWidth / 2)),
                //     ),
                //     frame: 0
                // })
            }else{
                // Hide sprite is exist
                if(spawnedItems[block] !== undefined){
                    spawnedItems[block].hidden = true
                }
            }
        }
    } 

    equipFields.forEach((field, i) => {
        let x = -((itemCol / 2) * tileWidth) + (tileWidth / 2)
        let index = i
        if((i + 1) > (equipFields.length / 2)){
            x = -tileWidth + (tileWidth / 2)
            index = i - (equipFields.length / 2)
        }

        const frame = (i === 3 || i === 6)? 4: 
                    (i === 4)? 0:
                    (i === 5)? 5:
                    (i === (equipFields.length - 1))? 6:
                    i + 1     
                    
        if(player.equip[field]?.id){
            placeItemInGrid(
                inventory,
                -1,
                {
                    index: -1,
                    item: player.equip[field],
                    frame
                },
                {
                    x,
                    y: -((itemRow - (0.5 + (1.5 * index))) * tileWidth)
                },
                tileWidth,
                player.equip[field],
                'equipment',
                field
            )                 
        }         
    })
}

const placeItemInGrid = (
    inventory: GameObj, 
    block: number,
    data: note, 
    spawn: { x: number, y: number },  
    tileWidth: number,
    spawnedItems: GameObj[],
    spriteName?: string,
    tag?: string
) => {
    const item = inventory.add([
        sprite(spriteName?? "item", { frame: data.frame }),
        area(),
        anchor('center'),
        fixed(),
        pos(spawn.x, spawn.y),
        {
            index: data.index,
            item: { ...data.item },
            spawn
        },
        tag?? 'item'
    ])

    item.use(drag(item))

    if(data.item.stackable){
        item.add([
            text(data.item.quantity && data.item.quantity > 1? String(data.item.quantity) : ""),
            anchor('botright'),
            pos(0, 0),
            "text"
        ])        
    }

    console.log('item placed', item)
    
    item.onMousePress(() => {
        if(curDraggin) return
        console.log('item on mouse press')
        if(item.isHovering()){
            if(isPickable(item)) item.pick()                              
        }
    })

    item.onMouseRelease(() => {
        if(curDraggin && curDraggin.id === item.id){
            console.log('item on drag end')
            curDraggin.trigger("dragEnd");
            curDraggin = null                                    
        }
    })

    if(isPickable(item)){
        item.onDrag(() => {
            if(curDraggin && curDraggin.id === item.id){
                readd(item)
            }
        })      
        
        item.onDragEnd(() => {
            const storedInventory = getGameStoreValue().inventory

            const dist = {
                x: Math.floor((item.pos.x - item.spawn.x) / tileWidth),
                y: Math.floor((item.pos.y - item.spawn.y) / tileWidth)
            }

            // TODO: If mouse release outside of inventory window
            if(
                item.worldPos.x > range.right || item.worldPos.x < range.left ||
                item.worldPos.y > range.down || item.worldPos.y < range.top
            ){
                // Drop item
                const player = get('player')[0]
                dropItem(
                    player, 
                    [{ name: item.item.name, item: JSON.parse(JSON.stringify(item.item)), frame: item.frame }]
                )

                if(block >= 0){
                    // Remove item in gameStore
                    const storedIndex = storedInventory.space.findIndex(item => item.index === block)
                    storedInventory.space.splice(storedIndex, 1)
                    // Update gameStore
                    gameStore.set(inventoryUI, storedInventory)

                    // Destory dragging item
                    item.destroy()                    
                }
                
                return
            }

            // TODO: If the mouse release on equipment blocks
            let equip = false
            for(const [key, value] of Object.entries(range.equip)){
                console.log('key', key)
                const { top, down, left, right } = value

                if(
                    item.worldPos.y > top && item.worldPos.y < down &&
                    item.worldPos.x > left && item.worldPos.x < right
                ){
                    //TODO: equip item
                    const player = get('player')[0]
                    // If the slot is taken
                    if(player.equip[key]?.id){
                        // switch block
                        const gear = inventory.get(key)[0]
                        gear.untag(key)
                        gear.pos = vec2(item.spawn.x, item.spawn.y)
                        gear.item.index = item.index
                        gear.spawn = {
                            x: item.spawn.x,
                            y: item.spawn.y
                        }
                        // Push item to gameStore
                        storedInventory.space.push({
                            index: item.index,
                            item: gear.item,
                            frame: gear.frame
                        })
                    }

                    item.worldPos = vec2(left + (tileWidth / 2), top + (tileWidth / 2)) 

                    // Remove item in gameStore
                    const storedIndex = storedInventory.space.findIndex(stored => stored.index === item.index)
                    storedInventory.space.splice(storedIndex, 1)
                    // Update gameStore
                    gameStore.set(inventoryUI, storedInventory)

                    equip = equipItem(player, key, item.item)

                    break
                }
            }

            if(equip) return

            // TODO: If the mouse release inside inventory but outside of item grid
            if(
                item.worldPos.y > range.top && item.worldPos.y < range.items.top ||
                item.worldPos.x < range.items.left || item.worldPos.x > range.items.right
            ){
                // Put the item back to the spawn postion
                item.pos = vec2(item.spawn.x, item.spawn.y)
                return
            }

            const targetBlock = block + (inventory.itemCol * dist.y) + dist.x

            // TODO: If overlap with item
            if(spawnedItems[targetBlock] !== undefined){
                // TODO: If item is stackable
                if(spawnedItems[targetBlock].item.id === item.item.id && item.item.stackable){
                    // Stack up
                    spawnedItems[targetBlock].item.item.quantity += 1

                    spawnedItems[targetBlock].children[0].text = spawnedItems[targetBlock].item.item.quantity

                    // Destory dragging item
                    item.destroy()

                    return
                }else{
                    // switch position
                    spawnedItems[targetBlock].pos = vec2(item.spawn.x, item.spawn.y)
                    spawnedItems[targetBlock].index = block
                }
            }
            
            item.pos = vec2(
                dist.x < 0?
                item.spawn.x - (tileWidth * Math.abs(dist.x)):
                item.spawn.x + (tileWidth * dist.x),
                dist.y < 0?
                item.spawn.y - (tileWidth * Math.abs(dist.y)):
                item.spawn.y + (tileWidth * dist.y)
            )
            
            // Update spawn position
            item.spawn.x = item.pos.x
            item.spawn.y = item.pos.y       
            item.index = targetBlock                     
        })
    }    
}

// #endregion

export const setUIElements = (player: GameObj, map: GameObj) => {
    const { tileWidth } = getOptionValue()

    const ui = map.add([
        pos(0, 0),
        fixed(),
        layer('fg'),
        // stay(),
        'ui'
    ])

    const barWidth = k.width() / 4
    const barHeight = k.height() / 20  

    // #region HP, MP, LV UI
    // Place invisible area for both HP and MP bar.
    const hpBar = ui.add([
        area({
            shape: new Rect(vec2(0), barWidth, barHeight)
        }),
        pos(k.width() * 0.2, k.height() * 5/6),
        fixed(),
        {
            displayText: false
        }
    ])

    const mpBar = ui.add([
        area({
            shape: new Rect(vec2(0), barWidth, barHeight)
        }),
        pos(k.width() * 0.55, k.height() * 5/6),
        fixed(),
        {
            displayText: false
        }        
    ])

    hpBar.onClick(() => {
        console.log('hp')
        hpBar.displayText = !hpBar.displayText
    }, 'left')

    mpBar.onClick(() => {
        console.log('mp')
        mpBar.displayText = !mpBar.displayText
    }, 'left')      

    // const hpBar = ui.add([
    //     rect(barWidth, barHeight, {
    //         fill: true,
    //         radius: 4
    //     }),
    //     area(),
    //     color(150, 0 ,0),
    //     pos(k.width() * 0.2, k.height() * 5/6),
    // ])

    // const mpBar = ui.add([
    //     rect(barWidth, barHeight, {
    //         fill: true,
    //         radius: 4
    //     }),
    //     area(),
    //     color(50, 50, 50),
    //     pos(k.width() * 0.55, k.height() * 5/6),
    // ])    

    // hpBar.add([
    //     rect(0, barHeight),
    //     color(50, 50, 50),
    //     'HP'
    // ])

    // mpBar.add([
    //     rect(barWidth, barHeight),
    //     color(0, 0, 150),
    //     'MP'
    // ])      
    
    // let lastHp = player.hp
    // let lastMp = player.attribute.mp
    // let drawHpSteps: number[] = []

    ui.onDraw(async() => {
        const hpPercentage = player.hp / player.maxHP
        const mpPercentage = player.attribute.mp / player.max.mp

        // if(lastHp !== player.hp){
        //     const dist = lastHp - player.hp
        //     const each = dist / 60
        //     drawHpSteps = Array.from({ length: 60 }, (_, i) => i + 1).map(v => each * v)
            
        // }
        
        // HP outter bar
        // Color in reverse order
        drawRect({
            width: barWidth,
            height: barHeight,
            pos: vec2(k.width() * 0.2, k.height() * 5/6),
            color: rgb(50, 50 ,50)
        })

        // HP inner bar
        drawRect({
            width: barWidth * hpPercentage,
            height: barHeight,
            pos: vec2((k.width() * 0.2) + barWidth, k.height() * 5/6),
            color: rgb(150, 0 ,0),
            anchor: 'topright'
        })        

        // MP outter bar
        drawRect({
            width: barWidth,
            height: barHeight,
            pos: vec2(k.width() * 0.55, k.height() * 5/6),
            color: rgb(50, 50 ,50)
        })    
        
        // MP inner bar
        drawRect({
            width: barWidth * mpPercentage,
            height: barHeight,
            pos: vec2(k.width() * 0.55, k.height() * 5/6),
            color: rgb(0, 0 ,150)
        })   
        
        // HP text
        if(hpBar.displayText){
            drawText({
                text: `${player.hp}/${player.maxHP}`,
                pos: vec2(k.width() * 0.2, k.height() * 5/6 + ((barHeight - (tileWidth / 2)) / 2)),
                align: 'center',
                width: barWidth,
                size: tileWidth / 2
            })            
        }

        // MP text
        if(mpBar.displayText){
            drawText({
                text: `${player.attribute.mp}/${player.max.mp}`,
                pos: vec2(k.width() * 0.55, k.height() * 5/6 + ((barHeight - (tileWidth / 2)) / 2)),
                align: 'center',
                width: barWidth,
                size: tileWidth / 2
            })             
        }
    })

    const expRing = ui.add([
        anchor('center'),
        fixed(),
        pos(k.width() / 2, k.height() * 5/6)
    ])

    expRing.onDraw(() => {
        const progress = player.exp / player.max.exp
        const radius = Math.floor(k.width() / 40)
        const steps = 60
        const thickness = 10

        const outer = []
        const inner = []

        for(let i=0; i <= steps * progress; i++){
            const t = i / steps

            // outer edge
            outer.push(arcPoint(t, radius))

            // inner edge
            inner.push(arcPoint(t, radius - thickness))
        }

        // inner must reverse to close polygon properly
        inner.reverse()   

        // const pts = [...outer, ...inner]

        // const start = 255
        // const end = 10
        // const total = start - end 
        // const each = total / pts.length
        
        // const colorSteps = pts.map((p, i) => {
        //     // console.log(progress)
        //     return rgb(0, start - (i * each), 0)
        // })

        // console.log('colorSteps', colorSteps)

        // Outer circle
        drawCircle({
            pos: vec2(0,0),
            radius: radius,
            color: rgb(50, 50, 50),
            outline: {
                width: thickness / 2,
                color: rgb(50, 50, 50)
            }
        })          

        drawPolygon({ 
            pts: [...outer, ...inner],
            color: rgb(0, 150, 0),
            pos: vec2(0, 0),
        })

        // Inner circle
        drawCircle({
            pos: vec2(0,0),
            radius: radius -10,
            color: rgb(50, 50, 50)
        })  
        
        drawText({
            text: player.lv,
            size: radius - 10,
            width: radius - 10,
            pos: vec2(0, 0),
            align: 'center',
            anchor: 'center',
            // color: rgb(255, 0, 255)
        })
    })

    const tool = ui.add([
        rect(k.width()/ 2, barHeight, { fill: false }),
        anchor('center'),
        pos(k.width()/ 2, k.height() - barHeight),
        outline(tileWidth / 4),
        color(50, 50, 50),
    ])

    // 10 slots for key binding
    // 6 slots for inventory, skill, character, quest, map, option

    const slotWidth = tool.width / 16 
    const shortCut = ['I', 'S', 'C', 'Q', 'M', 'O']

    for(let i=0; i < 16; i++){
        const slot = tool.add([
            rect(slotWidth, barHeight),
            pos((i >= 8)? 0 + ((i - 8) * slotWidth) : 0 - ((8 - i) * slotWidth), 0 - (barHeight / 2)),
            area(),
            color(50, 50, 50),
            fixed()
        ])

        if(i < 10){
            slot.add([
                text(String(i + 1), {
                    size: tileWidth / 3,
                })
            ])            
        }else{
            slot.add([
                text(shortCut[i - 10], {
                    size: tileWidth / 3,
                })
            ])                 
        }

        // slot.onHoverUpdate(() => { console.log('slot hovered') })

        slot.onClick(() => {
            console.log('slot clicked')
        })
    }    
    // #endregion 
}

// #region inventory UI
export const setInventoryUI = async(player: GameObj, map: GameObj, tileWidth: number, open = false) => {
    // If UI created
    const ui = map.get('ui')[0]
    const inventory = ui.get('inventory')
    const inventoryWidth = k.width() / 2
    const inventoryHeight = k.height() * 19/20
    const itemRow = 6
    const itemCol = 12    

    if(inventory.length){
        console.log('toggle inventory')
        inventory[0].hidden = !open

        // Place Items
        displayItemsInGrid(inventory[0], tileWidth)

        return
    }else
    if(open){
        // Create ui
        const inventory = ui.add([
            pos(k.width() / 2, k.height() / 2),
            {
                width: inventoryWidth,
                height: inventoryHeight,
                itemRow,
                itemCol
            },
            anchor('center'),
            'inventory'
        ])

        setRangeData(inventory, tileWidth)        

        inventory.onDraw(() => {
            drawRect({
                width: inventoryWidth,
                height: inventoryHeight,
                pos: vec2(0, 0),
                anchor: 'center',
                color: rgb(50, 50, 50),
                radius: tileWidth / 4
            })

            // #region Equipment
            drawSprite({
                sprite: 'player',
                pos: vec2(-((itemCol / 4) * tileWidth), -(inventoryHeight / 4)),
                frame: 0,
                anchor: 'center',
                width: tileWidth * 4,
                height: tileWidth * 4
            })

            equipFields.forEach((_, i) => {
                let x = -((itemCol / 2) * tileWidth) + (tileWidth / 2)
                let index = i
                if((i + 1) > (equipFields.length / 2)){
                    x = -tileWidth + (tileWidth / 2)
                    index = i - (equipFields.length / 2)
                }

                drawRect({
                    width: tileWidth,
                    height: tileWidth,
                    pos: vec2(x, -((itemRow - (0.5 + (1.5 * index))) * tileWidth)),
                    anchor: 'center',
                    color: rgb(0, 0, 0),
                    outline: {
                        width: tileWidth / 10,
                        color: rgb(75, 75, 75)
                    }                
                })

                const frame = (i === 3 || i === 6)? 4: 
                            (i === 4)? 0:
                            (i === 5)? 5:
                            (i === (equipFields.length - 1))? 6:
                            i + 1
 
                drawSprite({
                    sprite: 'equipment',
                    pos: vec2(x, -((itemRow - (0.5 + (1.5 * index))) * tileWidth)),
                    anchor: 'center',
                    frame,
                    opacity: 0.5
                })
            })
            // #endregion

            const padding = 10

            // Gold
            drawText({
                text: `$ ${getGameStoreValue().inventory.gold}`,
                size: tileWidth / 3,
                anchor: 'topright',
                pos: vec2(0 + (inventoryWidth / 2) - padding, 0 - (inventoryHeight / 2) + padding)
            })

            // #region Attribute

            drawRect({
                width: tileWidth * ((itemCol / 2) - 1),
                height: tileWidth * itemRow,
                pos: vec2(tileWidth, -(itemRow * tileWidth)),
                color: rgb(0, 0, 0),
                outline: {
                    width: tileWidth / 10,
                    color: rgb(75, 75, 75)
                }                
            })       

            // Player LV
            drawText({
                text: `LV ${player.lv}`,
                size: tileWidth / 3,
                pos: vec2(tileWidth + padding, -(itemRow * tileWidth) + (padding / 2))
            })        
            
            // Player name
            drawText({
                text: `NAME`,
                size: tileWidth / 3,
                pos: vec2(tileWidth + padding, -(itemRow * tileWidth) + ((padding / 2) * 2) + (tileWidth / 2))
            })              

            // Player class
            drawText({
                text: `CLASS`,
                size: tileWidth / 3,
                pos: vec2(tileWidth + padding, -(itemRow * tileWidth) + ((padding / 2) * 3) + tileWidth)
            })                 

            const buttons = inventory.get('button')

            Object.entries(player.attribute).forEach(([key, value], i) => {
                const count = i + 4
                const fontSize = i + 3

                if(key === 'hp' || key === 'mp'){
                    drawText({
                        text: `${key.toUpperCase()}: ${value}/${key === 'hp'? player.maxHP : player.max.mp}`,
                        size: tileWidth / 3,
                        pos: vec2(tileWidth + padding, -(itemRow * tileWidth) + ((padding / 2) * count) + ((tileWidth / 2) * fontSize))                        
                    })                      
                }else{
                    drawText({
                        text: `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`,
                        size: tileWidth / 3,
                        pos: vec2(tileWidth + padding, -(itemRow * tileWidth) + ((padding / 2) * count) + ((tileWidth / 2) * fontSize))                             
                    })   
                }
                
                // Display "PLUS" button or not
                if(player.pt > 0 && !buttons.length){
                    const button = inventory.add([
                        rect(tileWidth, tileWidth),
                        pos(tileWidth + padding, + (itemRow * tileWidth) + ((padding / 2) * count) + ((tileWidth / 2) * fontSize)),
                        area(),
                        color(75, 75, 75),
                        fixed(),
                        {
                            key
                        },
                        'button'
                    ])

                    button.onClick(() => {
                        player.attribute[button.key] = Number(value) + 1
                        player.pt -= 1
                    })
                }else
                if(player.pt === 0 && buttons.length){
                    buttons[i].hidden = true
                }else if(buttons[i] !== undefined){
                    buttons[i].hidden = false
                }
            })

            // EXP
            drawText({
                text: `EXP: ${player.exp}/${player.max.exp}`,
                size: tileWidth / 3,
                pos: vec2(tileWidth + padding, -(itemRow * tileWidth) + ((padding / 2) * 9) + ((tileWidth / 2) * 8))
            })      
            
            // PT
            drawText({
                text: `Point: ${player.pt}`,
                size: tileWidth / 3,
                pos: vec2(tileWidth + padding, -(itemRow * tileWidth) + ((padding / 2) * 10) + ((tileWidth / 2) * 9))
            })                  
            // #endregion
            
            // #region Items
            drawRect({
                width: tileWidth * itemCol,
                height: tileWidth * itemRow,
                pos: vec2(0, inventoryHeight / 4),
                anchor: 'center',
                color: rgb(0, 0, 0),
            })         
            
            // Draw item blocks
            for(let row=0; row < (itemRow + 1); row++){
                // horizontal lines

                const py =
                        // If index point to center row or deeper
                        ((row + 1) >= (itemRow / 2))?

                        // Y + ((row - halfRow) * tileWidth) + halfTile
                        (inventoryHeight / 4) + ((row - (itemRow / 2)) * tileWidth):
                        
                        // Y - ((halfRow - row) * tileWidth)
                        (inventoryHeight / 4) - (((itemRow / 2) - row) * tileWidth)                 

                drawLine({
                    // Start
                    p1: vec2(
                        // relativeX - (halfCol * tileWidth)
                        0 - ((itemCol / 2) * tileWidth), 
                        py
                    ),
                    // End
                    p2: vec2(
                        // halfCol * tileWidth
                        (itemCol / 2) * tileWidth, 
                        py
                    ),
                    width: tileWidth / 10,
                    color: rgb(75, 75, 75)
                })
            }       
            
            // Vertical lines            
            for(let col=0; col < (itemCol + 1); col++){
                const px = 
                        // If index is point to center col or deeper
                        (col + 1) >= (itemCol / 2)? 
                        
                        // relativeX + (col - halfCol) * tileWidth
                        0 + (col - (itemCol / 2)) * tileWidth:

                        // relativeX - (halfCol -col) * tileWidth
                        0 - (((itemCol / 2) - col) * tileWidth)

                drawLine({
                    // start
                    p1: vec2(
                        px,
                        // Y - (halfRow * tileWidth)
                        (inventoryHeight / 4) - ((itemRow / 2) * tileWidth)
                    ),
                    p2: vec2(
                        px,
                        // Y + (halfRow * tileWidth)
                        (inventoryHeight / 4) + ((itemRow / 2) * tileWidth)
                    ),
                    width: tileWidth / 10,
                    color: rgb(75, 75, 75)
                })       
            }            

            // drawRect({
            //     width: tileWidth,
            //     height: tileWidth,
            //     pos: vec2(
            //         // If index point to the center col
            //         (col + 1) >= (itemCol / 2)? 
                    
            //         // ((col - halfCol) * tileWidth) - (halfTile)
            //         (((col + 1) - (itemCol / 2)) * tileWidth) - (tileWidth / 2):

            //         // relativeX - ((halfCol - col) * tileWodth) + (halfTile)
            //         0 - (((itemCol / 2) - (col)) * tileWidth) + (tileWidth / 2),   

            //         // If index point to the center row
            //         ((row + 1) >= (itemRow / 2))?

            //         // relativeY + ((row - halfRow) * tileWidth) - (halfTile)
            //         (inventoryHeight / 4) + (((row + 1) - (itemRow / 2)) * tileWidth) - (tileWidth / 2):                            

            //         // relativeY - ((halfRow - row) * tileWidth) - (halfTile)
            //         (inventoryHeight / 4) - ((((itemRow / 2) - (row)) * tileWidth) - (tileWidth / 2)),
            //     ),
            //     anchor: 'center',
            //     color: rgb(0, 0, 0),
            //     outline: {
            //         width: tileWidth / 10,
            //         color: rgb(75, 75, 75)
            //     }
            // })  
            // #endregion            
        })

        // TODO: Place items
        displayItemsInGrid(inventory, tileWidth)
    }
}
// #endregion  