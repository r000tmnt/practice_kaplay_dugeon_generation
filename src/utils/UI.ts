import type { GameObj } from "kaplay";
import k from "../lib/kaplay";
import { getOptionValue } from "../store/setting";

const {
    area,
    anchor,
    // circle,
    color,
    debug,
    // drawCurve,
    drawCircle,
    drawPolygon,
    drawText,
    drawRect,
    // easings,
    // evaluateBezier,
    fixed,
    // Line,
    layer,
    outline,
    // polygon,
    pos,
    // Rect,
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
        'UI'
    ])

    const barWidth = k.width() / 4
    const barHeight = k.height() / 20  

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

    ui.onDraw(() => {
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
        drawText({
            text: `${player.hp}/${player.maxHP}`,
            pos: vec2(k.width() * 0.2, k.height() * 5/6 + ((barHeight - (tileWidth / 2)) / 2)),
            align: 'center',
            width: barWidth,
            size: tileWidth / 2
        })

        // MP text
        drawText({
            text: `${player.attribute.mp}/${player.max.mp}`,
            pos: vec2(k.width() * 0.55, k.height() * 5/6 + ((barHeight - (tileWidth / 2)) / 2)),
            align: 'center',
            width: barWidth,
            size: tileWidth / 2
        })        
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

    // Place invisible area for both HP and MP bar.
    // const hpBar = ui.add([
    //     area({
    //         shape: new Rect(vec2(0), barWidth, barHeight)
    //     }),
    //     pos(k.width() * 0.2, k.height() * 5/6),
    //     {
    //         displayText: false
    //     }
    // ])

    // const mpBar = ui.add([
    //     area({
    //         shape: new Rect(vec2(0), barWidth, barHeight)
    //     }),
    //     pos(k.width() * 0.55, k.height() * 5/6),
    //     {
    //         displayText: false
    //     }        
    // ])

    // hpBar.onClick(() => {
    //     console.log('hp')
    // }, 'left')

    // mpBar.onClick(() => {
    //     console.log('mp')
    // }, 'left')      
}