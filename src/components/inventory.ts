import type { GameObj, Anchor } from "kaplay";
import k from "../lib/kaplay";
import { getOptionValue } from "../store/setting";
import { getGameStoreValue, gameStore, inventoryUI } from "../store/game";
import type { EquipField, item, note, RarityTypes } from "../model/item";
import { itemSubType, RARITY_COLORS } from "../model/item";

import { equipItem, getPlayers, unequipItem } from "../utils/player";
import { drag, isPickable } from "../utils/UI";
import { dropItem } from "../utils/item"

const {
    area,
    anchor,
    color,
    Color,
    drawRect,
    drawSprite,
    drawText,
    drawLine,
    fixed,
    get,
    // mousePos,
    opacity,
    outline,
    pos,
    rgb,
    readd,
    rect,
    sprite,
    text,
    vec2,
} = k

// #region inventory 
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

const setRangeData = (inventory: GameObj, tileWidth: number) => {
    const { width, height, itemRow, itemCol } = inventory
    const itemWindowCenter = vec2(0, height / 4)    

    range.top = -(height / 2)
    range.down = (height / 2)
    range.left = -(width / 2)
    range.right = (width / 2)

    equipFields.forEach((field, i) => {
        let x = -((itemCol / 2) * tileWidth)
        let index = i
        if((i + 1) > (equipFields.length / 2)){
            x = -tileWidth 
            index = i - (equipFields.length / 2)
        }
        const y = -((itemRow - (0.5 + (1.5 * index))) * tileWidth) - (tileWidth / 2)
        // const offset = -0.5 + (1.5 * index)
        range.equip[field].top = y
        range.equip[field].down = y + tileWidth
        range.equip[field].left = x
        range.equip[field].right = x + tileWidth
    })

    range.items.top = itemWindowCenter.y - ((itemRow / 2) * tileWidth)
    range.items.down = itemWindowCenter.y + ((itemRow / 2) * tileWidth)
    range.items.left = itemWindowCenter.x - ((itemCol / 2) * tileWidth)
    range.items.right = itemWindowCenter.x + ((itemCol / 2) * tileWidth)
}

const isEquipment = (item: item) => {
    return equipFields.find(field => {
        const key = item.id.split('_')[0]
        // console.log(field, field.toLowerCase().includes(key))
        return field.toLowerCase().includes(key)
    })
}

export const displayItemsInGrid = (inventory:GameObj, tileWidth: number) => {
    // Get pages
    // const page = Math.floor(getGameStoreValue().inventory.limit / (itemRow * itemCol))
    const space = getGameStoreValue().inventory.space 
    const spawnedItems = inventory.get('item')
    const { itemRow, itemCol } = inventory
    const player = get('player')[0]

    for(let row=0; row < itemRow; row++){
        for(let col=0; col < itemCol; col++){
            // If item exist
            const block = col + (itemCol * row)
            if(space[block]){
                // TODO: If item took the space already
                const placedItem = spawnedItems.find(item => item.index === block)
                if(!placedItem){
                    console.log(`item ${block} not found, spawning...`)
                    // Anchor center
                    const spawn = {
                        x: range.items.left + (col * tileWidth) + (tileWidth / 2),
                        y: range.items.top + (row * tileWidth) + (tileWidth / 2),   
                    }

                    // Add sprite
                    placeItemInGrid(
                        inventory,
                        space[block],
                        spawn,
                        tileWidth,
                        spawnedItems,
                    )
                }
            }else{
                // Hide sprite if exist
                // if(spawnedItems[block] !== undefined){
                //     spawnedItems[block].hidden = true
                // }
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
                    
        // If there is an equipment and the sprite is not created            
        if(player.equip[field]?.id && !inventory.get(field).length){
            placeItemInGrid(
                inventory,
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
                field
            )                 
        }         
    })
}

const placeItemInGrid = (
    inventory: GameObj, 
    data: note, 
    spawn: { x: number, y: number },  
    tileWidth: number,
    spawnedItems: GameObj[],
    tag?: string
) => {
    const item = inventory.add([
        sprite(Number(data.item.type) <= 17? "equipment" : "item", { frame: data.frame }),
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
        if('dragging' in item && item.dragging === true) return
        console.log('item on mouse press')
        if(item.isHovering()){
            if(isPickable(item)) item.pick()     
            // If item is drag from equipment slot
            const equipment = isEquipment(item.item)

            if(equipment){
                const player = get('player')[0]

                // Deduct value
                unequipItem(player, equipment)
            }                                          
        }
    })

    item.onMouseRelease(() => {
        if('dragging' in item && item.dragging === true){
            console.log('item on drag end')
            item.trigger("dragEnd");
            item.dragging = false                             
        }
    })

    if(isPickable(item)){
        item.onDrag(() => {
            if('dragging' in item && item.dragging === true){
                readd(item)
            }
        })      
        
        item.onDragEnd(() => {
            const storedInventory = getGameStoreValue().inventory
            
            // Get dist from inventory pos
            const dist = {
                x: Math.floor(Math.abs(item.pos.x - range.items.left) / tileWidth),
                y: Math.floor(Math.abs(item.pos.y - range.items.top) / tileWidth)
            }

            console.log('dist', dist)

            const equipment = isEquipment(item.item)
            let equip = false       

            // TODO: If mouse release outside of inventory window
            if(
                item.pos.x > range.right || item.pos.x < range.left ||
                item.pos.y > range.down || item.pos.y < range.top
            ){
                // Drop item
                const player = get('player')[0]
                dropItem(
                    player, 
                    [{ name: item.item.name, item: JSON.parse(JSON.stringify(item.item)), sprite: equipment? 'equipment' : 'item', frame: item.frame }]
                )

                if(item.index >= 0){
                    // Remove item in gameStore
                    storedInventory.space[item.index] = null
                    // Update gameStore
                    gameStore.set(inventoryUI, storedInventory)
                
                }

                // Destroy dragging item
                item.destroy()                    
                
                return
            }

            // TODO: If the mouse release inside inventory but outside of item grid
            if(
                item.pos.y > range.top && item.pos.y < range.items.top ||
                item.pos.x < range.items.left || item.pos.x > range.items.right
            ){
                // If hovering on equipment slots
                if(
                    equipment && 
                    item.pos.y >= range.equip[equipment].top && item.pos.y <= range.equip[equipment].down &&
                    item.pos.x >= range.equip[equipment].left && item.pos.x <= range.equip[equipment].right
                ){
                    const player = get('player')[0]
                    // If the slot is taken
                    if(player.equip[equipment]?.id){
                        const gear = inventory.get(equipment)[0]
                        gear.tag('item')
                        gear.untag(equipment)

                        // Swap position
                        if(item.index >= 0){
                            gear.pos = vec2(item.spawn.x, item.spawn.y)
                            gear.index = item.index
                            gear.spawn = JSON.parse(JSON.stringify({
                                x: item.spawn.x,
                                y: item.spawn.y
                            }))

                            storedInventory.space[item.index] = {
                                index: item.index,
                                item: gear.item,
                                frame: gear.frame
                            }
                        }
                    }else{
                        if(item.index >= 0) storedInventory.space[item.index] = null
                    }

                    equip = equipItem(player, equipment, item.item)

                    item.pos = vec2(range.equip[equipment].left + (tileWidth / 2), range.equip[equipment].top + (tileWidth / 2))
                    item.spawn = JSON.parse(JSON.stringify({
                        x: item.pos.x,
                        y: item.pos.y
                    }))                    
                    item.untag('item')
                    item.tag(equipment)
                    item.index = -1                    
                }else{
                    // Put the item back to the spawn position
                    item.pos = vec2(item.spawn.x, item.spawn.y)
                }
            }  
            
            if(equip){
                gameStore.set(inventoryUI, storedInventory)
                return
            }

            const targetBlock = (inventory.itemCol * dist.y) + dist.x

            // TODO: If overlap with item
            if(spawnedItems[targetBlock] !== undefined){
                // TODO: If item is stackable
                if(spawnedItems[targetBlock].item.id === item.item.id && item.item.stackable){
                    // Stack up
                    spawnedItems[targetBlock].item.item.quantity += 1

                    spawnedItems[targetBlock].children[0].text = spawnedItems[targetBlock].item.item.quantity

                    if(storedInventory.space[targetBlock] && storedInventory.space[targetBlock].item.quantity){
                        storedInventory.space[targetBlock].item.quantity += 1
                    }

                    // Destroy dragging item
                    item.destroy()
                }else{
                    // if Overlapping item is an equipment
                    const overlaps = isEquipment(spawnedItems[targetBlock].item)

                    // If the dragging item is an equipment but not the same type
                    if(equipment && equipment !== overlaps){
                        // No more space
                        if(storedInventory.space.length === storedInventory.limit) return

                        // Find another space
                        const empty = storedInventory.space.findIndex(s => !s)
                        
                        item.index = empty
                        item.tag('item')
                        item.untag(equipment)
                        item.spawn = JSON.parse(JSON.stringify({
                            x: range.items.left + (Math.floor(empty % inventory.itemCols) * tileWidth) + (tileWidth / 2),
                            y: range.items.top + (Math.floor(empty / inventory.itemCols) * tileWidth) + (tileWidth / 2)
                        }))     

                        storedInventory.space[empty] = {
                            index: empty,
                            item: item.item,
                            frame: item.frame
                        }      
                        
                    }else{
                        // swap position
                        spawnedItems[targetBlock].pos = vec2(item.spawn.x, item.spawn.y)
                        spawnedItems[targetBlock].spawn = JSON.parse(JSON.stringify(item.spawn))
                        spawnedItems[targetBlock].index = item.index

                        // If Overlapping item is the same type as dragging item
                        if(equipment && equipment === overlaps){
                            // Equip item
                            equipItem(getPlayers()[0], equipment, spawnedItems[targetBlock].item)
                        }

                        // Update store value
                        if(storedInventory.space[targetBlock]) storedInventory.space[targetBlock].index = item.index   
                    }
                }
            }else{
                console.log(`Block ${targetBlock} is empty`)

                item.pos = vec2(
                    range.items.left + (tileWidth * dist.x) + (tileWidth / 2),
                    range.items.top + (tileWidth * dist.y) + (tileWidth / 2)
                )
                
                // Update spawn position
                item.spawn = JSON.parse(JSON.stringify({ x: item.pos.x, y: item.pos.y }))   
                
                // Add tags
                if(equipment){
                    item.tag('item')
                    item.untag(equipment)
                }

                // Update store value
                storedInventory.space[targetBlock] = {
                    index: targetBlock,
                    item: item.item,
                    frame: item.frame
                }          
                
                if(item.index >= 0){
                    storedInventory.space[item.index] = null       
                }      

                // Update index
                item.index = targetBlock
            }

            gameStore.set(inventoryUI, storedInventory)
        })


        // #region item on hover
        item.onHoverUpdate(() => {
            const detail = inventory.parent?.get('detail')

            // If not dragging
            if('dragging' in item && item.dragging === false && !inventory.hidden){
                // Display detail
                const equipment = isEquipment(item.item)

                // Get dist from inventory pos
                const dist = {
                    x: Math.floor(Math.abs(item.pos.x - range.items.left) / tileWidth),
                    y: Math.floor(Math.abs(item.pos.y - range.items.top) / tileWidth)
                }

                // console.log(dist)

                const padding = 10

                const itemColor = RARITY_COLORS[item.item.rarity? item.item.rarity.toLowerCase() as RarityTypes : 'common']

                // Get the param to display
                const attribute: string[] = [
                    // name
                    `[rarity]${item.item.name}[/rarity]`,
                    // Rarity + type,
                    `${item.item.rarity} ${item.item.type? itemSubType[item.item.type] : ''}`,
                    // Desc
                    item.item.desc
                ]
                
                // Attribute
                if(item.item.attribute){
                    Object.entries(item.item.attribute).forEach(([key, value]) => {
                        attribute.push(`${key.charAt(0).toUpperCase() + key.slice(1)} ${Number(value) < 0? `-${value}` : `+${value}`}`)
                    })
                }

                // Secondary
                if(item.item.secondary){
                    Object.entries(item.item.secondary).forEach(([key, value]) => {
                        attribute.push(`${key.charAt(0).toUpperCase() + key.slice(1)} ${Number(value) < 0? `-${value}` : `+${value}`}`)
                    })
                }
                
                // Resist
                if(item.item.resist){
                    Object.entries(item.item.resist).forEach(([key, value]) => {
                        attribute.push(`${key.charAt(0).toUpperCase() + key.slice(1)} ${Number(value) < 0? `-${value}` : `+${value}`}%`)
                    })
                }

                // effect
                if(item.item.effect){
                    Object.entries(item.item.effect).forEach(([key, value]) => {
                        attribute.push(`${key.charAt(0).toUpperCase() + key.slice(1)} ${value}`)
                    })
                }                

                // Requirement
                if(item.item.required){
                    attribute.push(`Require:`)
                    Object.entries(item.item.required).forEach(([key, value]) => {
                        attribute.push(` ${key.charAt(0).toUpperCase() + key.slice(1)} ${value}`)
                    })
                }                

                const maxTextARow = 23
                const desc = attribute[2]
                const descRow = (desc.length % maxTextARow) > 0? Math.floor(desc.length / maxTextARow) + 1 : Math.floor(desc.length / maxTextARow)                  

                const dw = tileWidth * 5
                let dh = ((tileWidth / 3) * attribute.length) + (padding * (attribute.length + 1))

                if(descRow > 1) dh += (tileWidth / 3) * descRow

                let dx = item.worldPos.x + (tileWidth / 2)
                let dy = item.worldPos.y - (tileWidth / 2)
                let origin : Anchor = 'topleft'

                if( 
                    equipment &&
                    item.pos.y >= range.equip[equipment].top && item.pos.y <= range.equip[equipment].down &&
                    item.pos.x >= range.equip[equipment].left && item.pos.x <= range.equip[equipment].right
                ){
                    // Hovering on equipment slot. Do nothing
                }else{
                    if(dist.x > (inventory.itemCol / 2)) dx = dx - tileWidth
                    if(dist.y > (inventory.itemRow / 2)) dy = dy + tileWidth

                    origin = `${dist.y > (inventory.itemRow / 2)? 'bot' : 'top'}${dist.x > (inventory.itemCol / 2)? 'right' : 'left' }`

                    // origin = dist.x > 0 && dy > 0 ? 'botright':
                    //             dx < 0 && dy < 0 ? 'topright':
                    //             dx > 0 && dy > 0 ? 'botleft' :
                    //             dx > 0 && dy < 0 ? 'topleft' : 'topleft'                    
                }        

                if(detail?.length){
                    console.log('change detail position', origin)
                    // Change position
                    detail[0].height = dh
                    detail[0].anchor = origin
                    detail[0].pos = vec2(dx, dy)
                    detail[0].children[0].height = dh
                    detail[0].children[0].descRow = descRow
                    detail[0].children[0].anchor = origin
                    detail[0].children[0].attribute = attribute
                    detail[0].hidden = false

                    // Keep the detail as the last child
                    readd(detail[0])
                    // readd(detail[0].children[0])
                }else{
                    // outline first
                    const detail = inventory.parent?.add([
                        rect(dw, dh, { radius: tileWidth / 4, fill: false }),
                        outline(2, Color.fromHex(itemColor)),
                        pos(dx, dy),
                        anchor(origin),
                        // tags
                        "detail"
                    ])

                    detail?.add([
                        rect(dw, dh, { radius: tileWidth / 4 }),
                        pos(0, 0),
                        color(0, 0, 0),
                        opacity(0.75),
                        anchor(origin), 
                        {
                            attribute,
                            descRow
                        }                  
                    ])

                    detail?.children[0].onDraw(() => {    
                        detail.children[0].attribute.forEach((param: string, i: number) => {
                            let tx = padding
                            let ty = ((tileWidth / 3) * i) + (padding * (i + 1))

                            if(i > 2 && detail.children[0].descRow > 1){
                                ty += (tileWidth / 3) * detail.children[0].descRow
                            }

                            if(detail.children[0].anchor.includes('bot')){
                                ty = ty - padding - (dh - padding)
                            }

                            if(detail.children[0].anchor.includes('right')){
                                tx = tx - padding - (dw - padding)
                            }

                            drawText({
                                text: param,
                                size: tileWidth / 3,
                                width: dw - (padding * 2),
                                pos: vec2(tx, ty),
                                styles: {
                                    'red': color(150, 0, 0),
                                    'rarity': color(Color.fromHex(itemColor))
                                },
                                anchor: 'topleft'
                            })                    
                        })
                    })             
                }     
            }else{
                if(detail?.length) detail[0].hidden = true
            }
        })

        item.onHoverEnd(() => {
            // Hide detail
            const detail = inventory.parent?.get('detail')

            if(detail?.length && !inventory.hidden) detail[0].hidden = true
        })

        // #endregion
    }    
}

const displayAttributeButtons = (
    inventory: GameObj, 
    player: GameObj, 
    tileWidth: number, 
    itemRow: number, 
    itemCol: number, 
    padding: number
) => {
    const buttons = inventory.get('button')

    // Display "PLUS" button or not
    if(player.pt > 0){
        if(!buttons.length){
            Object.entries(player.attribute).forEach((params, i) => {
                const key = params[0]
                const count = i + 4
                const fontSize = i + 3
                const ay = -(itemRow * tileWidth) + ((padding / 2) * count) + ((tileWidth / 2) * fontSize)

                const button = inventory.add([
                    rect(tileWidth / 3, tileWidth / 3),
                    pos((tileWidth * ((itemCol / 2) - 1)) + (tileWidth / 3), ay),
                    area(),
                    color(75, 75, 75),
                    fixed(),
                    {
                        key
                    },
                    'button'
                ])

                button.add([
                    text('+', { width: button.width, align: 'center', size: tileWidth / 3 }),
                    pos(0, 0)
                ])

                button.onClick(() => {
                    player.attribute[button.key] += 1
                    player.pt -= 1
                })

                button.onUpdate(() => {
                    button.hidden = player.pt === 0
                })
            })
        }
    }
}

/**
 * Create or open inventory
 * @param parent - The wrapper of the element.
 * @param player - Who the inventory belongs to.
 * @param open - The current open state of inventory
 * @returns 
 */
export const setInventoryUI = async(parent: GameObj, player: GameObj, open = false) => {
    const { tileWidth } = getOptionValue()
    // If UI created
    const inventory = parent.get('inventory')
    const inventoryWidth = k.width() / 2
    const inventoryHeight = k.height() * 19/20
    const itemRow = 6
    const itemCol = 12    
    const padding = 10

    if(inventory.length){
        console.log('toggle inventory')
        inventory[0].hidden = !open

        // Place Items
        displayItemsInGrid(inventory[0], tileWidth)

        displayAttributeButtons(inventory[0], player, tileWidth, itemRow, itemCol, padding)

        return
    }else
    if(open){
        // Create ui
        const inventory = parent.add([
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

            Object.entries(player.attribute).forEach(([key, value], i) => {
                const count = i + 4
                const fontSize = i + 3
                const ax = tileWidth + padding
                const ay = -(itemRow * tileWidth) + ((padding / 2) * count) + ((tileWidth / 2) * fontSize)

                if(key === 'hp' || key === 'mp'){
                    drawText({
                        text: `${key.toUpperCase()}: ${value}/${key === 'hp'? player.maxHP : player.max.mp}`,
                        size: tileWidth / 3,
                        pos: vec2(ax, ay)                        
                    })                      
                }else{
                    drawText({
                        text: `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`,
                        size: tileWidth / 3,
                        pos: vec2(ax, ay)                             
                    })   
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

        displayAttributeButtons(inventory, player, tileWidth, itemRow, itemCol, padding)

        // TODO: Place items
        displayItemsInGrid(inventory, tileWidth)

        return inventory
    }
}
// #endregion  