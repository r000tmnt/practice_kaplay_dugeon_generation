import type { GameObj, Color, Vec2 } from "kaplay"
import k from "../lib/kaplay"
import { getOptionValue } from "../store/setting"
import { getGameStoreValue } from "../store/game"

const {
    area,
    anchor,
    color,
    drawText,
    drawSprite,
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

const shortCut = ['I', 'S', 'C', 'Q', 'M', 'O']

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
    const slotWidth = tool.width / 16 

    for(let i=0; i < 16; i++){
        const px = (i >= 8)? 0 + ((i - 8) * slotWidth) : 0 - ((8 - i) * slotWidth)
        const py = 0 - (height / 2)

        const slot = tool.add([
            rect(slotWidth, height),
            pos(px, py),
            area(),
            color(50, 50, 50),
            fixed(),
            {
                binded: {}
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

            setData('listOpen', true)

            const key = slot.tags[2]

            if(isNaN(Number(key))){
                switch(key){
                    case 'I': case 'C':{
                        // const { inventory } = getGameStoreValue()
                        // setInventoryUI(player, map, tileWidth, inventory.open)
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
                // number keys
                const { inventory } = getGameStoreValue()

                // TODO: Display avialable item and skill
                const list = tool.get('list')

                const potions = inventory.space.filter(stored => stored.item.id.includes('potion'))

                // Skill list
                const skill = [{ index: 0, skill: { id: 'skill_000', name: 'placeHolder' }, frame: 0 }]

                const options = [ ...potions, ...skill, { index: -1, item: { id: 'clear' } } ]

                let listHeight = 0

                listHeight = ((options.length / 2) + (options.length % 2)) * tileWidth

                if(list.length){
                    list[0].hidden = false
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

                    onHover('list', () => { setData('hovering', true) })

                    onHoverEnd('list', () => { setData('hovering', false) })

                    options.forEach((opt, i) => {
                        // const type = 'item' in opt? 'potion' : 'skill'
                        const index = i + 1
                        const ox = (index % 2 === 0)? tileWidth: 10
                        const oy = 0 - ((tileWidth / 2) * ((options.length / 2) - Math.floor((index % 2 === 0)? (index - 1) / 2 : index / 2)))

                        if('item' in opt && opt.item.id.includes('clear')){
                            const clear = list.add([
                                text("CLEAR", { size: tileWidth / 3 }),
                                area(),
                                anchor('botleft'),
                                pos(ox, oy),
                                fixed()                                
                            ])

                            clear.onClick(() => { 
                                console.log('clear cliked')
                                slot.binded = {} 
                            })
                        }else{
                            const option = list.add([
                                sprite('item', { frame: 0 }),
                                area(),
                                anchor('botleft'),
                                pos(ox, oy),
                                fixed()
                            ])

                            // Assign options to slot
                            option.onClick(() => {
                                console.log('option cliked')
                                list.hidden = true

                                if('item' in opt){
                                    slot.binded = opt.item
                                }

                                if('skill' in opt){
                                    slot.binded = opt.skill
                                }

                                setData('listOpen', false)
                            })                            
                        }
                    })                    
                }
            }             
        })

        slot.onDraw(() => {
            if(Object.entries(slot.binded).length){
                drawSprite({
                    sprite: 'item', // TODO: Need another sprite
                    frame: 0,
                    anchor: 'center',
                    pos: vec2(slotWidth / 2, height / 2)
                })

                if('quantity' in slot.binded){
                    drawText({
                        text: String(slot.binded.quantity),
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