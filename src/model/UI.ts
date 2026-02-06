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
    inventoryRange
}