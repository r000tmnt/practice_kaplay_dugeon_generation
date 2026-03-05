import type { GameObj, Color, Vec2 } from "kaplay"
import k from "../lib/kaplay"
import { getOptionValue } from "../store/setting"
import { gameStore, getGameStoreValue, inventoryUI } from "../store/game"
import { setInventoryUI } from "./inventory"
import { defineItemSprite } from '../utils/item'
import type { item } from "../model/item"

const {
    area,
    anchor,
    color,
    drawText,
    drawSprite,
    getData,
    get,
    fixed,
    outline,
    onHover,
    onHoverEnd,
    pos,
    rgb,
    rect,
    setData,
    sprite,
    text,
    vec2
} = k

const shortCut = ['I', 'S', 'Q', 'M', 'O']

/**
 * Create a set of short cuts to use item etc...
 * @param parent - The wrapper of the element.
 * @param width - The width of the element.
 * @param height - The height of the element.
 * @param position - Where to place the element.
 * @param fill - Should the bar filled with color
 * @param border - The setting for outline.
    * @param border.width - The width of outline.
    * @param border.color - The color of outline.
 * @returns 
 */
export const createToolBar = (
    parent: GameObj, 
    width: number, 
    height: number,
    position: Vec2, 
    fill: boolean,
    border?: {
        width: number,
        color: Color
    }
) => {
    const { tileWidth } = getOptionValue()

    const tool = parent.add([
        rect(width, height, { fill }),
        anchor('center'),
        pos(position.x, position.y),
        fixed(),
        'tool'
    ])

    if(border) tool.use(outline(border.width, border.color))

    // 10 slots for key binding
    // 6 slots for inventory, skill, character, quest, map, option
    const slotWidth = tool.width / 15

    for(let i=0; i < 15; i++){
        const px = (i >= 7.5)? 0 + ((i - 7.5) * slotWidth) : 0 - ((7.5 - i) * slotWidth)
        const py = 0 - (height / 2)

        const slot = tool.add([
            rect(slotWidth, height),
            pos(px, py),
            area(),
            color(50, 50, 50),
            fixed(),
            {
                bind: {}
            }, 
            'slot'           
        ])

        onHover('slot', () => { setData('hovering', true) })

        onHoverEnd('slot', () => { setData('hovering', false) })

        if(i < 10){
            slot.add([
                text(String(i + 1), {
                    size: tileWidth / 3,
                })
            ])  
            
            slot.tag(String(i))
        }else{                 
            slot.add([
                text(shortCut[i - 10], {
                    size: tileWidth / 3,
                })
            ])         
            
            slot.tag(shortCut[i - 10])
        }              

        // slot.onHoverUpdate(() => { console.log('slot hovered') })

        slot.onClick(() => {
            console.log('slot clicked')

            const key = slot.tags[2]

            if(isNaN(Number(key))){
                switch(key){
                    case 'I':{
                        const { inventory } = getGameStoreValue()
                        if(inventory.open) return
                        inventory.open = !inventory.open
                        setInventoryUI(get('map')[0].get('ui')[0], get('player')[0], inventory.open).then(() => {
                            gameStore.set(inventoryUI, inventory)            
                        })          
                    }
                    break;
                    case 'S':
                        // SKILL
                    break; 
                    case 'Q':
                        // QUEST
                    break; 
                    case 'M':
                        // MAP
                    break; 
                    case 'O':
                        // OPTION
                    break;                                                                                                 
                }
            }else{
                setData('listOpen', true)

                // number keys
                const { inventory } = getGameStoreValue()

                // TODO: Display available item and skill
                const list = tool.get('list')

                // const items = parent.get('inventory')[0].get('item')

                // const potions = items.filter(item => item.item.id.includes('potion'))

                const potions = inventory.space.filter(stored => stored?.item.id.includes('potion'))

                // Skill list
                // const skill = [{ index: 0, skill: { id: 'skill_000', name: 'placeHolder' }, frame: 0 }]

                const options = [{index: -1, item: { id: '-1' }}, ...potions ]

                let listHeight = 0

                listHeight = options.length * (tileWidth / 2) + 20 // plus gap

                if(list.length){
                    list[0].height = listHeight
                    list[0].pos = vec2(slot.pos.x, slot.pos.y)
                }else{
                    const lx = 0 - (slotWidth * (9 - (Number(key) + 1)))

                    const list = tool.add([
                        area(),
                        rect(tileWidth * 2, listHeight || 10),
                        anchor('botleft'),
                        pos(lx, 0 - (height / 2)),
                        fixed(),
                        outline(4, rgb(75, 75, 75)),
                        color(0, 0, 0),
                        'list',
                    ])

                    list.onHover(() => { setData('hovering', true) })

                    list.onHoverEnd(() => { setData('hovering', false) })

                    list.onUpdate(() => {
                        const open = getData('listOpen')
                        list.hidden = !open
                    })                

                    options.forEach((opt, i) => {
                        // const type = 'item' in opt? 'potion' : 'skill'
                        if(!opt) return
                        const index = i + 1
                        // const ox = (index % 2 === 0)? tileWidth: 10
                        const ox = 10
                        const oy = 0 - ((tileWidth / 2) * index) + 10

                        if(opt.index < 0){
                            // Create clear button first
                            const clear = list.add([
                                text("CLEAR", { size: tileWidth / 3 }),
                                area(),
                                anchor('botleft'),
                                pos(ox, oy),
                                fixed(),
                                'option'                            
                            ])

                            clear.onClick(() => { 
                                console.log('clear clicked')
                                slot.bind = {} 
                            })                                
                        }else{
                            const itemSprite = defineItemSprite(opt.item.id.split('_')[0])

                            const option = list.add([
                                sprite(
                                    itemSprite.sprite, 
                                    { frame: itemSprite.frame }
                                ),
                                area(),
                                anchor('botleft'),
                                pos(ox, oy),
                                fixed(),
                                'option'
                            ])

                            onHover('option', () => { setData('hovering', true) })

                            onHoverEnd('option', () => { setData('hovering', false) })

                            // Assign options to slot
                            option.onClick(() => {
                                const { quickSlot } = getGameStoreValue()
                                console.log('option clicked')

                                if('item' in opt){    
                                    slot.bind = opt.item
                                    quickSlot[index] = opt.item as item
                                }

                                // if('skill' in opt){
                                //     slot.bind = opt.skill
                                // }

                                setData('listOpen', false)
                            })                                   
                        }   
                    })                    
                }
            }             
        })

        slot.onDraw(() => {
            if(Object.entries(slot.bind).length){
                drawSprite({
                    sprite: 'item', // TODO: Need another sprite
                    frame: 0,
                    anchor: 'center',
                    pos: vec2(slotWidth / 2, height / 2)
                })

                if('quantity' in slot.bind){
                    drawText({
                        text: String(slot.bind.quantity),
                        size: tileWidth / 3,
                        anchor: 'botright',
                        pos: vec2(slotWidth, height)
                    })
                }
            }
        })
        // slot.isOverlapping()
    }     
    
    return tool
}