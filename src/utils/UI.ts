import type { GameObj } from "kaplay";
import k from "../lib/kaplay";

const {
    // area,
    anchor,
    // circle,
    color,
    // drawCurve,
    drawCircle,
    drawPolygon,
    drawText,
    // evaluateBezier,
    fixed,
    // Line,
    layer,
    // polygon,
    pos,
    rect,
    rgb,
    // stay,
    // text,
    vec2,
} = k

// #region Utils
const arcPoint = (t: number, radius: number) => {
    const angle = t * Math.PI * 2

    return vec2(Math.cos(angle) * radius, Math.sin(angle) * radius)    
}
// #endregion

export const setUIElements = (player: GameObj, map: GameObj) => {
    const ui = map.add([
        pos(0, 0),
        fixed(),
        layer('fg')
        // stay()
    ])

    const hpBar = ui.add([
        rect(k.width() / 4, k.height() / 10, {
            fill: true,
            radius: 4
        }),
        color(0, 0 ,0),
        pos(k.width() * 0.2, k.height() * 5/6)
    ])

    const mpBar = ui.add([
        rect(k.width() / 4, k.height() / 10, {
            fill: true,
            radius: 4
        }),
        color(0, 0 ,0),
        pos(k.width() * 0.55, k.height() * 5/6)
    ])    

    hpBar.add([
        rect(k.width() / 4, k.height() / 10),
        color(150, 0, 0)
    ])

    mpBar.add([
        rect(k.width() / 4, k.height() / 10),
        color(0, 0, 150)
    ])    

    const expRing = ui.add([
        anchor('center'),
        pos(k.width() / 2, k.height() * 5/6)
    ])

    // expRing.add([ 
    //     text(`[black]${player.lv}[/black]`, { 
    //         align: 'center', 
    //         size: 48, 
    //         width: Math.floor(k.width() / 20) * 2,
    //         styles: { 
    //             "black": {
    //                 color: rgb(255, 255, 255)
    //             }
    //         } 
    //     }), 
    //     pos(0, 0) ])

    expRing.onDraw(() => {
        const progress = player.exp / player.max.exp
        const radius = Math.floor(k.width() / 20)
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
}