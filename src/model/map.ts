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

export type {
    room,
    corridor
}