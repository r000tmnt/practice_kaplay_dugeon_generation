import type { GameObj, KEventController } from "kaplay";
import k from "../lib/kaplay";
import { getOptionValue } from "../store/setting";
// import { getGameStoreValue } from "../store/game";
// import type { uiOwner } from "../model/UI"

import { rectangleGauge, ringGauge } from "./gauge";
import { createToolBar } from "./toolBar";

const {
    area,
    drawText,
    drawRect,
    fixed,
    getData,
    get,
    layer,
    pos,
    Rect,
    rgb,
    setData,
    vec2,
} = k

let targetBar : {
    bar: GameObj,
    controller: KEventController
} | null

const displayTextOnBar = (bar:GameObj, barHeight: number, tileWidth: number ) => {
    const { unit, attribute, worldPos, area } = bar

    drawText({
        text: `${unit.attribute[attribute]}/${unit.max[attribute]}`,
        pos: vec2(worldPos.x, worldPos.y + ((barHeight - (tileWidth / 2)) / 2)),
        align: 'center',
        width: area.shape.width,
        size: tileWidth / 2
    })         
}

export const setUIElements = (player: GameObj, map: GameObj) => {
    const { tileWidth } = getOptionValue()

    const ui = map.add([
        area({ shape: new Rect(vec2(0), k.width(), k.height()) }),
        pos(0, 0),
        fixed(),
        layer('fg'),
        // stay(),
        'ui'
    ])

    const barWidth = k.width() / 4
    const barHeight = k.height() / 20  

    ui.onClick(() => {
        const isHovering = getData('hovering')
        console.log('ui wrapper clicked', isHovering)        
        if(!isHovering) setData('listOpen', false)
    })

    // #region Enemy Health bar
    ui.onDraw(() => {
        const targeting = getData('targeting', null)

        if(!targeting) return

        const target = JSON.parse(targeting)

        const barX = (k.width() / 2) - (barWidth / 2)
        const barY = tileWidth

        const percentage = target.current / target.max      

        // Enemy name
        drawText({
            text: `LV${target.lv} ${target.name}`,
            pos: vec2(barX, tileWidth / 2),
            align: 'left',
            width: barWidth,
            size: tileWidth / 2
        })  

        // outer bar
        drawRect({
            width: barWidth,
            height: barHeight,
            pos: vec2(barX, barY),
            color: rgb(50, 50 ,50),
            // radius
        })
        
        // Inner bar
        drawRect({
            width: barWidth * percentage,
            height: barHeight,
            pos: vec2(barX + barWidth, barY),
            color: rgb(150, 0 ,0),
            // radius,
            anchor: 'topright'
        })       

        // HP number
        drawText({
            text: `${target.current}/${target.max}`,
            pos: vec2(barX, barY + ((barHeight - (tileWidth / 2)) / 2)),
            align: 'center',
            width: barWidth,
            size: tileWidth / 2
        })            
    })
    // #endregion

    // #region HP, MP, LV UI
    // Place invisible area for both HP and MP bar.
    const hpBar = rectangleGauge({
        parent: ui,
        direction: 'horizontal',
        position: vec2(k.width() * 0.2, k.height() * 5/6),
        color: {
            inner: rgb(150, 0 ,0),
            outer: rgb(50, 50 ,50)
        },
        clickable: true,
        reverse: true,
        width: barWidth,
        height: barHeight,
        reference: {
            unit: player,
            attribute: 'hp'
        },
        border: {
            width: tileWidth / 4,
            color: rgb(50, 50, 50)
        },
        action: {
            event: 'draw',
            call: () => {
                if(hpBar.bar?.displayText){
                    displayTextOnBar(hpBar.bar, barHeight, tileWidth)
                }
            }
        },        
        option: { displayText: false }        
    })

    const mpBar = rectangleGauge({
        parent: ui,
        direction: 'horizontal',
        position: vec2(k.width() * 0.55, k.height() * 5/6),
        color: {
            inner: rgb(0, 0, 150),
            outer: rgb(50, 50, 50)
        },
        clickable: true,
        width: barWidth,
        height: barHeight,
        reference: {
            unit: player,
            attribute: 'mp'
        },
        action: {
            event: 'draw',
            call: () => {
                if(mpBar.bar?.displayText){
                    displayTextOnBar(mpBar.bar, barHeight, tileWidth)       
                }
            }
        },          
        border: {
            width: tileWidth / 4,
            color: rgb(50, 50, 50)
        },
        option: { displayText: false }        
    })

    hpBar.bar?.onClick(() => {
        const isHovering = getData('hovering') 
        if(isHovering) return

        console.log('hp', isHovering)
        hpBar.bar.displayText = !hpBar.bar.displayText
    }, 'left')

    mpBar.bar?.onClick(() => {
        const isHovering = getData('hovering') 
        if(isHovering) return
                
        console.log('mp')
        mpBar.bar.displayText = !mpBar.bar.displayText
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

    // EXP gauge
    ringGauge({
        parent: ui,
        radius: Math.floor(k.width() / 40),
        position: vec2(k.width() / 2, k.height() * 5/6),
        color: {
            inner: rgb(0, 150, 0),
            outer: rgb(50, 50, 50)
        },
        reference: {
            unit: player,
            attribute: 'exp',
        },
        option: { text: 'lv' }        
    })

    createToolBar(
        ui,
        k.width()/ 2, 
        barHeight,
        vec2(k.width()/ 2, k.height() - barHeight),
        false,
        {
            width: tileWidth / 4,
            color: rgb(50, 50, 50)
        }
    )
    // #endregion 
}