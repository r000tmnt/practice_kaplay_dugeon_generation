import type { GameObj } from "kaplay"

interface room {
    x: number, 
    y: number, 
    w: number, 
    h: number, 
    center: { 
        x: number, 
        y: number 
    }
}

interface corridor {
    x1: number, 
    y1: number, 
    x2: number, 
    y2: number
}

interface prop {
    type: string,
    x: number,
    y: number,
    roomId: number,
    broken?: boolean
}

interface chunk {
    x: number,
    y: number,
    props: prop[],
    enemies: [],
    walls: [],
    active: boolean,
    object: GameObj[]
}

export type {
    room,
    corridor,
    chunk
}