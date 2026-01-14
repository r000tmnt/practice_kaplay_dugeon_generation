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

interface roomNode extends room {
    id: number,
    state: number,
    connections: Set<number>
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
    open?: boolean
    defeat?: boolean
    active?: boolean
}

interface chunk {
    x: number,
    y: number,
    props: prop[],
    active: boolean,
    objects: {x:number, y:number}[]
}

const RoomState = {
    Unvisited: 0,
    Active: 1,
    Cleared: 2
}

export type {
    room,
    roomNode,
    corridor,
    chunk,
    prop,
}

export {
    RoomState
}