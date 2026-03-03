import type { Color, GameObj, KEventController, Vec2 } from "kaplay"
import k from "../lib/kaplay"
import type { rectGaugeOption, ringGaugeOption } from "../model/UI"

import { arcPoint } from '../utils/UI'

const {
    add,
    area,
    anchor,
    Circle,
    drawRect,
    drawCircle,
    drawPolygon,
    drawText,
    fixed,
    outline,
    onDraw,
    pos,
    // rgb,
    Rect,
    vec2,
} = k

const drawRectGauge = (
    width: number,
    height: number,
    position: Vec2,
    radius: number,
    direction: rectGaugeOption['direction'],
    reverse: boolean,
    color: rectGaugeOption['color'],
    reference: rectGaugeOption['reference'],
    action: rectGaugeOption['action']
) => {
    const { unit, attribute } = reference
    const percentage = unit.attribute[attribute] / unit.max[attribute]

    // outer bar
    drawRect({
        width,
        height,
        pos: position,
        color: color.outer,
        radius
    })
    
    // Inner bar
    drawRect({
        width: (direction === 'horizontal')? width * percentage : width,
        height: (direction === 'vertical')? height * percentage : height,
        pos: reverse? vec2(position.x + width, position.y) : position,
        color: color.inner,
        radius,
        anchor: reverse?  'topright' : 'topleft'
    })       

    if(action && action.event === 'draw') action.call()    
}

/**
 * Create gauge element in shape of rectangle
 * @param width - The width of the element.
 * @param height - The height of the element.
 * @param direction - How to place the element
 * @param position - Where to place the element
 * @param color - Support to set color for both outer and inner of the element
 * @param reference - The number to determine how the gauge looks like.
    * @param reference.unit - Who provides the number.
    * @param reference.attribute - The attribute to check per frame.
 * @param radius - Optional. Radius of each corner.
 * @param clickable - Optional. If the element can invoke click event. Will return the element for further usage.
 * @param reverse - Optional. If the direction if the meter should go in reverse order. 
 * @param parent - Optional. The wrapper of the element. If undefined, the element will attached to the root.
 * @param border - Optional. The setting for outline.
    * @param border.width - The width of outline.
    * @param border.color - The color of outline.
*  @param action - Optional. Things to do when the element exist.
    * @param action.type - 'draw' or 'update'
    * @param action.call - The action to take if condition matched.   
 * @param option - Optional. An object contains any property you need.
 * @returns 
 */
export const rectangleGauge = (rectGaugeOption: rectGaugeOption) => {
    const {
        width,
        height,
        radius,
        direction,
        position,
        color,
        clickable,
        reverse,        
        reference,
        parent,
        border,
        action,
        option
    } = rectGaugeOption

    let controller : KEventController

    if(parent){
        controller = parent.onDraw(() => {
            drawRectGauge(
                width,
                height,
                position,
                radius?? 0,
                direction,
                reverse?? false,
                color,
                reference,
                action
            )
        })          
    }else{
        controller = onDraw(() => {
            drawRectGauge(
                width,
                height,
                position,
                radius?? 0,
                direction,
                reverse?? false,
                color,
                reference,
                action
            )
        })
    }
    
    if(clickable){
        let bar : GameObj
        if(parent){
            bar = parent.add([
                area({
                    shape: new Rect(vec2(0), width, height)
                }),
                pos(position.x, position.y),
                fixed(),
                {
                    ...reference,
                    ...option
                }
            ])              
        }else{
            bar = add([
                area({
                    shape: new Rect(vec2(0), width, height)
                }),
                pos(position.x, position.y),
                fixed(),
                {
                    ...reference,
                    ...option
                }
            ])    
        }

        if(border?.width){
            bar.use(outline(border.width, border.color))
        }

        return { bar, controller }
    }else{
        return { bar: reference.unit, controller }
    }
}


/**
 * Create gauge element in shape of ring.
 * @param parent - The wrapper of the element.
 * @param radius - Determine the size of the element.
 * @param position - Where to place the element.
 * @param clickable - If the element can invoke click event. Will return the element for further usage.
 * @param color - Support to set color for both outer and inner of the element.
 * @param reference - The number to determine how the gauge looks like.
    * @param reference.unit - Who provides the number.
    * @param reference.attribute - The attribute to check per frame.
 * @param option - An object contains any property you need. 
 */
export const ringGauge = (ringGaugeOption: ringGaugeOption) => {
    const {
        radius,
        position,
        color,
        reference,
        parent,
        clickable,
        option
    } = ringGaugeOption

    let ring: GameObj

    if(parent){
        ring = parent.add([
                anchor('center'),
                fixed(),
                pos(position.x, position.y),
                {
                    ...reference,
                    ...option
                }        
            ])
    }else{
        ring = add([
            anchor('center'),
            fixed(),
            pos(position.x, position.y),
            {
                ...reference,
                ...option
            }        
        ])        
    }

    ring.onDraw(() => {
        const { unit, attribute } = reference
        const start = Math.floor(unit.max[attribute] / 2.5) * (unit.lv - 1)
        const ringLength = unit.max[attribute] - start 
        const progress = (unit[attribute] - start) / ringLength
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
            color: color.outer,
            outline: {
                width: thickness / 2,
                color: color.outer
            }
        })          

        drawPolygon({ 
            pts: [...outer, ...inner],
            color: color.inner,
            pos: vec2(0, 0),
        })

        // Inner circle
        drawCircle({
            pos: vec2(0,0),
            radius: radius -10,
            color: color.outer
        })  

        if(option?.text !== undefined){
            drawText({
                text: unit[option.text],
                size: radius - 10,
                width: radius - 10,
                pos: vec2(0, 0),
                align: 'center',
                anchor: 'center',
                // color: rgb(255, 0, 255)
            })                
        }
    })  

    if(clickable) ring.use(area({ shape: new Circle(vec2(0), radius) }))
    
    return ring    
}