import type { GameObj } from "kaplay";
import k from "../lib/kaplay";
import { getOptionValue } from "../store/setting";

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
    // getData,
    // Line,
    layer,
    outline,
    // polygon,
    pos,
    Rect,
    rect,
    rgb,
    // stay,
    text,
    // tween,
    vec2,
} = k

// #region Utils
const arcPoint = (t: number, radius: number) => {
    const angle = t * Math.PI * 2

    return vec2(Math.cos(angle) * radius, Math.sin(angle) * radius)    
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

    if(inventory.length){
        console.log('toggle inventory')
        inventory[0].hidden = !open
        return
    }else
    if(open){
        const inventoryWidth = k.width() / 2
        const inventoryHeight = k.height() * 19/20
        const itemRow = 6
        const itemCol = 12

        // Create ui
        const inventory = ui.add([
            pos(k.width() / 2, k.height() / 2),
            anchor('center'),
            'inventory'
        ])

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

            // Head
            drawRect({
                width: tileWidth,
                height: tileWidth,
                pos: vec2(-((itemCol / 2) * tileWidth) + (tileWidth / 2), -((itemRow - 1) * tileWidth)),
                anchor: 'center',
                color: rgb(0, 0, 0),
                outline: {
                    width: tileWidth / 10,
                    color: rgb(75, 75, 75)
                }                
            })
            
            // Body
            drawRect({
                width: tileWidth,
                height: tileWidth,
                pos: vec2(-((itemCol / 2) * tileWidth) + (tileWidth / 2), -((itemRow - 2.5) * tileWidth)),
                anchor: 'center',
                color: rgb(0, 0, 0),
                outline: {
                    width: tileWidth / 10,
                    color: rgb(75, 75, 75)
                }                
            })    
            
            // Feet
            drawRect({
                width: tileWidth,
                height: tileWidth,
                pos: vec2(-((itemCol / 2) * tileWidth) + (tileWidth / 2), -((itemRow - 4) * tileWidth)),
                anchor: 'center',
                color: rgb(0, 0, 0),
                outline: {
                    width: tileWidth / 10,
                    color: rgb(75, 75, 75)
                }                
            })   

            // Accessory 1
            drawRect({
                width: tileWidth,
                height: tileWidth,
                pos: vec2(-((itemCol / 2) * tileWidth) + (tileWidth / 2), -((itemRow - 5.5) * tileWidth)),
                anchor: 'center',
                color: rgb(0, 0, 0),
                outline: {
                    width: tileWidth / 10,
                    color: rgb(75, 75, 75)
                }                
            })               

            // Right hand
            drawRect({
                width: tileWidth,
                height: tileWidth,
                pos: vec2(-tileWidth + (tileWidth / 2), -((itemRow - 1) * tileWidth)),
                anchor: 'center',
                color: rgb(0, 0, 0),
                outline: {
                    width: tileWidth / 10,
                    color: rgb(75, 75, 75)
                }                
            })     

            // Left hand
            drawRect({
                width: tileWidth,
                height: tileWidth,
                pos: vec2(-tileWidth + (tileWidth / 2), -((itemRow - 2.5) * tileWidth)),
                anchor: 'center',
                color: rgb(0, 0, 0),
                outline: {
                    width: tileWidth / 10,
                    color: rgb(75, 75, 75)
                }                
            })              

            // Accessory 2
            drawRect({
                width: tileWidth,
                height: tileWidth,
                pos: vec2(-tileWidth + (tileWidth / 2), -((itemRow - 4) * tileWidth)),
                anchor: 'center',
                color: rgb(0, 0, 0),
                outline: {
                    width: tileWidth / 10,
                    color: rgb(75, 75, 75)
                }                
            })              

            // Ring
            drawRect({
                width: tileWidth,
                height: tileWidth,
                pos: vec2(-tileWidth + (tileWidth / 2), -((itemRow - 5.5) * tileWidth)),
                anchor: 'center',
                color: rgb(0, 0, 0),
                outline: {
                    width: tileWidth / 10,
                    color: rgb(75, 75, 75)
                }                
            }) 
            // #endregion

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

            // TODO: Place items

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
    }
}
// #endregion  