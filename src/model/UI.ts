import type { Vec2, Color, GameObj } from "kaplay"

type direction = 'horizontal'|'vertical'

type event = 'draw'|'update'

type gaugeColor = {
    outter: Color,
    inner: Color
}

type uiOwner = {
    unit: GameObj,
    attribute: string
}

type border = {
    width: number,
    color: Color
}

type action = {
    event: event,
    call: () => void
}
interface rectGaugeOption {
    width: number, 
    height: number, 
    radius?: number,
    direction: direction,
    position: Vec2, 
    color: gaugeColor,
    reference: uiOwner,       
    clickable?: boolean, 
    reverse?: boolean, 
    parent?: GameObj,
    border?: border,  
    action?: action,     
    option?: Record<any, any>
}

interface ringGaugeOption {
    radius: number,
    position: Vec2,
    color: gaugeColor,
    reference: uiOwner,
    parent?: GameObj,
    clickable?: boolean,
    option?: Record<any, any>
}

interface range {
    top: number, down: number,
    left: number, right: number,                     
} 

interface inventoryRange {
    top: number, down: number,
    left: number, right: number,
    equip: {
        head: range,
        body: range,
        feet: range,
        accessory1: range,
        rightHand: range,
        leftHand: range,
        accessory2: range,
        ring: range,
    },
    items: range
}

export type {
    inventoryRange,
    rectGaugeOption,
    ringGaugeOption,
    uiOwner
}