/**
[Rooms + Corridors]
        ↓
     Build Graph
        ↓
 Pick Entrance
        ↓
      BFS
        ↓
 Find Unreachable Rooms
        ↓
  Carve Missing Corridors
        ↓
   Update Graph
        ↓
   Final Entrance / Exit

The algorithm works like this:

1. Start with one giant rectangle (the whole map).

2. Split it into two smaller rectangles.

3. Pick one of the smaller rectangles and split it again.

4. Repeat until you have many “leaf nodes.”

5. Place a room inside each leaf node.

6. Connect the rooms from sibling leaves using corridors.

7. Final result = a clean dungeon with rooms + hallways.

[ whole map ]
   → split → [ left ] + [ right ]
       → split → [ left-top ] + [ left-bottom ]
       → split → [ right-left ] + [ right-right ]       
 */
import k from '../lib/kaplay';
import type { room, roomNode, corridor, prop, rng } from "../model/map";
import { RoomState } from '../model/map'
import type { Vec2 } from 'kaplay';
import { cardLimit } from "../model/door";
import type { cardType } from "../model/door";

// Store
import { getOptionValue } from '../store/setting';
import { gameState, gameStore } from "../store/game";

const CORRIDOR_WIDTH = 2;   // tiles
const EDGE_TABLE : Record<number, number[][][]> = {
  1:  [[[0,0.5],[0.5,0]]],
  2:  [[[0.5,0],[1,0.5]]],
  3:  [[[0,0.5],[1,0.5]]],
  4:  [[[1,0.5],[0.5,1]]],
  5:  [[[0,0.5],[0.5,0]], [[1,0.5],[0.5,1]]],
  6:  [[[0.5,0],[0.5,1]]],
  7:  [[[0,0.5],[0.5,1]]],
  8:  [[[0.5,1],[0,0.5]]],
  9:  [[[0.5,0],[0.5,1]]],
  10: [[[0.5,0],[1,0.5]], [[0.5,1],[0,0.5]]],
  11: [[[1,0.5],[0.5,1]]],
  12: [[[1,0.5],[0,0.5]]],
  13: [[[0.5,0],[1,0.5]]],
  14: [[[0,0.5],[0.5,0]]],
};

const PROP: prop[] = []
const ENEMY: prop[] = []
const ROOMNODES: roomNode[] = []
const CARDTYPE: cardType[] = ['red', 'green', 'blue']

type RoomNode = {
    id: number;
    room: room;
    type: number;
    neighbors: Set<number>;
};

// Not all dead-ends should be equal.
const DeadEndType = {
    Treasure: 0.35,
    Breakables: 0.60,
    Lore: 0.75,
    RiskReward: 0.90,
    Empty: 0
}

const RoomType = {
    Entrance: 0,
    Exit: 1,
    MainPath: 2,
    SidePath: 3,
    DeadEndReward: 4,    
}

const { NavMesh, vec2, } = k

export const nav = new NavMesh();

//#region Utils
const hashString = (str: string) => {

  let hash = 0

  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }

  return hash

}

const createLCG = (hashed: number) => {
  const A = 1664525
  const C = 1013904223
  const M = 4294967296

  return function rng() {
    hashed = (A * hashed + C) % M
    return hashed / M
  }       
}

const createSeededRNG = (seed: number) => {

  const baseSeed = hashString(seed.toString())

  return {
    map: createLCG(baseSeed + hashString("map")),
    room: (roomId: number) => createLCG(baseSeed + hashString("room" + roomId)),
    door: createLCG(baseSeed + hashString("door")),
    corridor: createLCG(baseSeed + hashString("corridor")),
    enemy: createLCG(baseSeed + hashString("enemy")),
    loot: createLCG(baseSeed + hashString("loot")),
    props: createLCG(baseSeed + hashString("props"))
  } as rng
}

const randBetween = (rng: number, a: number, b: number) => {
    return Math.floor(rng * (b - a + 1)) + a;
}

const setCorridor = (
    leaf: Leaf, 
    roomA: roomNode, 
    roomB: roomNode, 
    grid: number[][], 
    rng: rng
) => {
    const pointA = {
        x: randBetween(rng.corridor(), roomA.x, roomA.x + roomA.w - 1),
        y: randBetween(rng.corridor(), roomA.y, roomA.y + roomA.h - 1)
    };

    const pointB = {
        x: randBetween(rng.corridor(), roomB.x, roomB.x + roomB.w - 1),
        y: randBetween(rng.corridor(), roomB.y, roomB.y + roomB.h - 1)
    };

    // L-shaped corridor
    if (rng.corridor() > 0.5) {
        leaf.corridors.push({ x1: pointA.x, y1: pointA.y, x2: pointB.x, y2: pointA.y });
        leaf.corridors.push({ x1: pointB.x, y1: pointA.y, x2: pointB.x, y2: pointB.y });
    } else {
        leaf.corridors.push({ x1: pointA.x, y1: pointA.y, x2: pointA.x, y2: pointB.y });
        leaf.corridors.push({ x1: pointA.x, y1: pointB.y, x2: pointB.x, y2: pointB.y });
    }          
    roomA.connections.add(roomB.id)     
    roomB.connections.add(roomA.id)     

    // Carve corridors
    leaf.corridors.forEach(({x1, x2, y1, y2}) => {
        if(x1 === x2){
            carveVertical(grid, x1, y1, y2)
        }else
        if(y1 === y2){
            carveHorizontal(grid, y1, x1, x2)
        }
    });
}

const createCorridors = (
    leaf: Leaf, 
    grid: number[][], 
    rng: rng
) => {
    if (leaf.left && leaf.right) {
        const roomA = leaf.left.getRoom();
        const roomB = leaf.right.getRoom();

        if(roomA && roomB) setCorridor(leaf, roomA, roomB, grid, rng)
    }

    if (leaf.left) createCorridors(leaf.left, grid, rng);
    if (leaf.right) createCorridors(leaf.right, grid, rng);   
}

const carveHorizontal = (map: number[][], y: number, x1: number, x2: number) => {
    const from = Math.min(x1, x2)
    const to   = Math.max(x1, x2)

    for (let x = from; x <= to; x++) {
        for(let dy = 0; dy < CORRIDOR_WIDTH; dy++){
            const dist = y + dy
            if (map[dist] !== undefined && dist > 0 && dist < (map.length - 1)) map[y + dy][x] = 0            
        }
    }
}

const carveVertical = (map: number[][], x: number, y1: number, y2: number) => {
    const from = Math.min(y1, y2)
    const to   = Math.max(y1, y2)

    for (let y = from; y <= to; y++) {
        for(let dx = 0; dx < CORRIDOR_WIDTH; dx++){
            const dist = x + dx
            if (map[y][dist] !== undefined && dist > 0 && dist < (map[y].length - 1)) map[y][x + dx] = 0         
        }
    }
}

const getManhattanDistance = (a: room, b: room) => {
    return Math.abs(a.center.x - b.center.x) + Math.abs(a.center.y - b.center.y);
} 

const isDoorReachable = (tilemap: number[][], x: number, y: number) => {
    console.log('top: ', tilemap[y - 1]?.[x] === 0)
    console.log('down: ', tilemap[y + 1]?.[x] === 0)
    console.log('left: ', tilemap[y]?.[x - 1] === 0)
    console.log('right: ', tilemap[y]?.[x + 1] === 0)
  return (
    tilemap[y - 1]?.[x] === 0 ||
    tilemap[y + 1]?.[x] === 0 ||
    tilemap[y]?.[x - 1] === 0 ||
    tilemap[y]?.[x + 1] === 0
  );
}

const findNearestFloor = async(tilemap: number[][], startX: number, startY: number) => {
  const visited = new Set();
  const queue = [{ x: startX, y: startY }];

  const key = (x: number, y: number) => `${x},${y}`;

  while (queue.length) {
    const pos = queue.shift();
    if (!pos) break;
    const { x, y } = pos;

    if (tilemap[y]?.[x] === 0) {
      return { x, y };
    }

    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const nx = x + dx;
      const ny = y + dy;

      if (!visited.has(key(nx, ny)) && tilemap[ny]?.[nx] !== undefined) {
        visited.add(key(nx, ny));
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return null;
}

const carveTunnel = async(tilemap: number[][], from: { x: number, y: number }, to: { x: number, y: number }) => {
  let x = from.x;
  let y = from.y;

  while (x !== to.x) {
    tilemap[y][x] = 0;
    x += Math.sign(to.x - x);
  }

  while (y !== to.y) {
    tilemap[y][x] = 0;
    y += Math.sign(to.y - y);
  }

  tilemap[y][x] = 0;
}

const checkDoorPosition = async(tilemap: number[][], door: { x: number, y: number }) => {
    const reachable = isDoorReachable(tilemap, door.x, door.y)
    console.log('reachable: ', reachable)
    if(!reachable){
        const destination = await findNearestFloor(tilemap, door.x, door.y)
        if(destination) await carveTunnel(tilemap, door, destination)
    }
}

const getValidDoorTiles = (room: roomNode, tilemap: number[][], rng: rng) => {
    const candidates: {x: number, y: number}[] = [];

    // Directions for adjacency: up, down, left, right
    const dirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy:  1 },
        { dx: -1, dy: 0 },
        { dx:  1, dy: 0 }
    ];  
    
    function isWalkable(x: number, y: number) {
        if (y < 0 || y >= tilemap.length) return false;
        if (x < 0 || x >= tilemap[0].length) return false;
        return tilemap[y][x] === 0;  // Marks floor / corridor
    }    

        // Helper to add candidate and check adjacency
    function checkAndAdd(x: number, y: number) {
        // Only consider if it's a wall tile
        if (tilemap[y][x] !== 1) return; // Your wall value (adjust as needed)

        // If is a corner
        // // Top left
        // if(tilemap[y - 1][x] === 0 && tilemap[y][x - 1] === 0) x += 1
        // // Top right
        // if(tilemap[y - 1][x] === 0 && tilemap[y][x + 1] === 0) x -= 1
        // // Down left
        // if(tilemap[y + 1][x] === 0 && tilemap[y][x - 1] === 0) x += 1
        // // Down right
        // if(tilemap[y + 1][x] === 0 && tilemap[y][x + 1] === 0) x -= 1

        const dir: boolean[] = []

        // Check if one side is walkable (corridor)
        for (const d of dirs) {
            const nx = x + d.dx;
            const ny = y + d.dy;
            if (isWalkable(nx, ny)) {
                dir.push(true)
            }
        }

        // Limit the valid door tile to facing one direction only
        if(dir.length === 1) candidates.push({ x, y });
    }

    for (let x = room.x + 1; x < (room.x + room.w) - 1; x++) {
        checkAndAdd(x, room.y); // TOP
        checkAndAdd(x, (room.y + room.h) - 1); // BOTTOM
    }

    for (let y = room.y + 1; y < (room.y + room.h) - 1; y++) {
        checkAndAdd(room.x, y); // LEFT
        checkAndAdd((room.x + room.w) - 1, y); // RIGHT
    }

    if (candidates.length === 0) return null; // No valid door

    return candidates[Math.floor(rng.room(room.id)() * candidates.length)];
}

const bfs = (startId: number, rooms: roomNode[]) => {
    const queue = [startId];
    const visited = new Set([startId]);
    const parent = new Map<number, number | null>();
    parent.set(startId, null);

    while (queue.length) {
        const current = queue.shift()!;
        for (const next of rooms[current].connections) {
            if (!visited.has(next)) {
                visited.add(next);
                parent.set(next, current);
                queue.push(next);
            }
        }
    }

    return { visited, parent };
}

const findFarthestRoom = (fromId: number, rooms: roomNode[]) => {
    const { visited, parent } = bfs(fromId, rooms);

    let last = fromId;
    for (const id of visited) last = id;

    return { id: last, parent };
}

const reconstructPath = (
    startId: number,
    endId: number,
    parent: Map<number, number | null>
) => {
    const path: number[] = [];
    let current: number | null = endId;

    while (current !== null) {
        path.push(current);
        current = parent.get(current)!;
    }

    // path.push(startId);
    return path.reverse();
}

const findRoomAt = (x: number, y: number, graph: Map<number, RoomNode>): number | null => {
    for (const [id, node] of graph) {
        const r = node.room;
        if (
            x >= r.x && x < r.x + r.w &&
            y >= r.y && y < r.y + r.h
        ) return id;
    }
    return null;
}

const findConnectedRooms = (
    grid: number[][],
    leaves: Leaf[],
    rng: rng
) => {
    // const visited = new Set<number>();
    // const queue = [startId];

    // visited.add(startId);

    // let current = 0

    // while (queue.length > 0) {
    //     try {
    //         current = queue.shift()!;
    //         for (const n of graph.get(current)!.neighbors) {
    //             if (!visited.has(n)) {
    //                 visited.add(n);
    //                 queue.push(n);
    //             }
    //         }            
    //     } catch {
    //         console.log(`Can't find id ${current}`)
    //     }
    // }

    // Hot fix 
    // Check around the edges of the wall for any rooms
    ROOMNODES.forEach(node => {
        const connected = {
            top: false,
            down: false,
            left: false,
            right: false
        }

        for(let x=node.x; x < node.w; x++){
            // top
            if(grid[node.y - 1][x] === 0) {
                connected.top = true
            }

            // down
            if(grid[node.y + node.h][x] === 0) {
                connected.down = true
            }            
        }
        
        
        for(let y=node.y; y < node.h; y++){
            // left
            if(grid[y][node.x - 1] === 0) {
                connected.left = true
            }

            // right
            if(grid[y][node.x + 1] === 0) {
                connected.right = true
            }
        }

        const connectedCount = Object.values(connected).filter(Boolean).length;
        if (connectedCount === 0) {
            console.log(`Room ${node.id} is not connected to any other room`);

            // Try to connect to any adjacent room
            if(node.connections.size === 0){
                // Find a valid room position
                 const connId = findNearestReachableRoom(node.id)
                 console.log(`Connecting room ${node.id} to nearest reachable room ${connId}`)
                if(connId) {
                    const leaf = leaves.find(l => l.room?.id === connId)
                    setCorridor(leaf!, node, ROOMNODES[connId], grid, rng)
                }
            }
            else{
                node.connections.forEach(connId => {
                    console.log(`Connecting room ${node.id} to connected room ${connId}`)
                    const leaf = leaves.find(l => l.room?.id === connId)
                    setCorridor(leaf!, node, ROOMNODES[connId], grid, rng)
                })
            }
        }
    })

    // return visited;
}

const findNearestReachableRoom =(
    fromId: number,
) => {
    let best = null;
    let bestDist = Infinity;

    const from = ROOMNODES[fromId];

    for (const room of ROOMNODES) {
        const to = room;
        const dist = getManhattanDistance(from, to);
        if (dist < bestDist) {
            bestDist = dist;
            best = room.id;
        }
    }

    return best;
}

const findDeadEnds = (graph: Map<number, RoomNode>) => {
    const deadEnds = [];

    for (const [id, node] of graph) {
        if (node.neighbors.size === 1) {
            deadEnds.push(id);
        }
    }

    return deadEnds;
}

const rollDeadEndType = (rng: number) => {
    switch(rng){
        case DeadEndType.Treasure:
            return DeadEndType.Treasure
        case DeadEndType.Breakables:
            return DeadEndType.Breakables
        case DeadEndType.Lore:
            return DeadEndType.Lore
        case DeadEndType.RiskReward:
            return DeadEndType.RiskReward
        default:
            return DeadEndType.Empty
    }
}

const getInnerSpaceAndTiles = (grid: number[][], room: room) => {
    const margin = 1

    const innerSpace = {
        x: room.x + margin,
        y: room.y + margin,
        w: room.w - (margin * 2),
        h: room.h - (margin * 2)
    }

    const tiles = getFloorTiles(grid, innerSpace as room)

    return { innerSpace, tiles }
}

const computeRoomDepths = (startId: number, graph: Map<number, RoomNode>) => {
    const depth = new Map();
    const queue = [[startId, 0]];
    depth.set(startId, 0);

    while (queue.length) {
        const item = queue.shift();
        if (!item) break;
        const [id, d] = item;
        for (const n of graph.get(id)!.neighbors) {
            if (!depth.has(n)) {
                depth.set(n, d + 1);
                queue.push([n, d + 1]);
            }
        }
    }

    return depth;
}

const getEnemySpawnRule = (roomNode: RoomNode) => {
    switch (roomNode.type) {
        case RoomType.Entrance:
            return null;

        case RoomType.Exit:
            return { min: 0, max: 1 };

        case RoomType.MainPath:
            return { min: 1, max: 3 };

        case RoomType.SidePath:
            return { min: 0, max: 2 };

        case RoomType.DeadEndReward:
            return { min: 0, max: 0 };

        default:
            return null;
    }
}

const scaleEnemies = (base: { min: number, max: number }, depth: number, rng: rng) => {
    // return Math.min(
    //     base.max,
    //     base.min + depth)
    return randBetween(rng.enemy(), base.max, base.min + depth)
}

const buildSpawnGrid = (room: roomNode, tilemap: number[][]) => {
    const free = [];

    for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
            const propExist = PROP.find(prop => prop.x === room.x && prop.y === room.y)
            if (tilemap[y][x] === 0 && !propExist) {
                free.push({ x, y });
            }
        }
    }

    return free;
}

// Reference: https://stackoverflow.com/a/46545530/14173422
const shuffle = (array: any[], rng: rng) => {
    const shuffled = array.map(value => ({ value, sort: rng.enemy() }))
                    .sort((a, b) => a.sort - b.sort)
                    .map(({ value }) => value)

    return shuffled
}

const placeEnemies = (room: roomNode, count: number, tilemap: number[][], rng: rng) => {
    let candidates = buildSpawnGrid(room, tilemap);
    candidates = shuffle(candidates, rng)

    for (let i = 0; i < count && candidates.length; i++) {
        // Add props
        ENEMY.push({
            type: 'enemy',
            x: candidates[i].x,
            y: candidates[i].y,
            roomId: room.id,
            defeat: false,
            active: false,
        })

        // candidates.pop()
    }

    // return candidates;
}

// Get points around the edges of the wall
const marchingSquares = (grid: number[][]) => {
  const { tileWidth } = getOptionValue()
  const edges = [];

  const h = grid.length;
  const w = grid[0].length;

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const A = grid[y][x]     === 0 ? 1 : 0;
      const B = grid[y][x + 1] === 0 ? 1 : 0;
      const C = grid[y + 1][x] === 0 ? 1 : 0;
      const D = grid[y + 1][x + 1] === 0 ? 1 : 0;

      const caseIndex = A | (B << 1) | (D << 2) | (C << 3);

      const caseEdges = EDGE_TABLE[caseIndex];
      if (!caseEdges) continue;

      for (const [[x1, y1], [x2, y2]] of caseEdges) {
        // Conver to the x and y on worldPos
        edges.push([
          { x: (x + x1) * tileWidth, y: (y + y1) * tileWidth },
          { x: (x + x2) * tileWidth, y: (y + y2) * tileWidth },
        ]);
      }
    }
  }

  return edges;
}

const buildPolygons = (edges: { x:number, y: number }[][]) => {
  const map = new Map();

  const key = (p: { x:number, y: number }) => `${p.x},${p.y}`;

  for (const [a, b] of edges) {
    if (!map.has(key(a))) map.set(key(a), []);
    if (!map.has(key(b))) map.set(key(b), []);

    map.get(key(a)).push(b);
    map.get(key(b)).push(a);
  }

  const polygons = [];
  const visited = new Set();

  for (const startKey of map.keys()) {
    if (visited.has(startKey)) continue;

    const polygon = [];
    let currentKey = startKey;
    let prevKey: string|null = null;

    while (!visited.has(currentKey)) {
      visited.add(currentKey);

      const [x, y] = currentKey.split(",").map(Number);
      polygon.push({ x, y });

      const neighbors = map.get(currentKey);
      const next = neighbors.find(
        (p: { x:number, y: number }) => key(p) !== prevKey
      );

      if (!next) break;

      prevKey = currentKey;
      currentKey = key(next);
    }

    if (polygon.length > 2) {
      polygons.push(polygon);
    }
  }

  return polygons;
}
//#endregion

//#region Leaf node
class Leaf{
    x: number;
    y: number;
    w: number;
    h: number;
    left: null|Leaf;
    right: null|Leaf;
    room: null|roomNode;
    corridors: corridor[];

    constructor(x: number, y: number, w: number, h: number) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

        this.left = null;
        this.right = null;

        this.room = null;      // {x, y, w, h}
        this.corridors = [];   // list of corridor segments
    }

    // Try splitting the leaf into two smaller leaves
    split(rng: number, MIN_LEAF_SIZE: number) {
        if (this.left !== null || this.right !== null) return false; // already split

        let splitH = rng > 0.5; // split horizontally or vertically

        if (this.w > this.h && this.w / this.h >= 1.25) {
            splitH = false; // force vertical
        } else if (this.h > this.w && this.h / this.w >= 1.25) {
            splitH = true; // force horizontal
        }

        const max = (splitH ? this.h : this.w) - MIN_LEAF_SIZE;
        if (max <= MIN_LEAF_SIZE) return false; // too small to split    
        
        const splitPos = Math.floor(rng * (max - MIN_LEAF_SIZE)) + MIN_LEAF_SIZE;

        if (splitH) {
            this.left = new Leaf(this.x, this.y, this.w, splitPos);
            this.right = new Leaf(this.x, this.y + splitPos, this.w, this.h - splitPos);
        } else {
            this.left = new Leaf(this.x, this.y, splitPos, this.h);
            this.right = new Leaf(this.x + splitPos, this.y, this.w - splitPos, this.h);
        }        

        return true
    }

    // Randomly create a room within this leaf
    createRoom(grid: number[][], rng: rng, MIN_ROOM_SIZE: number, MAX_ROOM_SIZE: number) {
        const roomRNG = rng.room(ROOMNODES.length)()
        const roomW = randBetween(roomRNG, MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, this.w - 2));
        const roomH = randBetween(roomRNG, MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, this.h - 2));

        const roomX = randBetween(roomRNG, this.x + 1, this.x + this.w - roomW - 1);
        const roomY = randBetween(roomRNG, this.y + 1, this.y + this.h - roomH - 1);

        this.room = { 
            id: ROOMNODES.length,
            x: roomX, 
            y: roomY, 
            w: roomW, 
            h: roomH, 
            center: { 
                x: roomX + Math.floor(roomW / 2), 
                y: roomY + Math.floor(roomH / 2) 
            },
            state: RoomState.Unvisited,
            connections: new Set() 
        };

        ROOMNODES.push(this.room)

        // Carve out room
        for (let y = this.room.y + 1; y < (this.room.y + this.room.h) - 1; y++) {
            for (let x = this.room.x + 1; x < (this.room.x + this.room.w) - 1; x++) {
                grid[y][x] = 0; // 0 = floor
            }
        }        
    }    

    // Get a room somewhere inside this leaf (going down tree if needed)
    getRoom(): null| roomNode {
        if (this.room) return this.room;

        if (this.left) {
            const room = this.left.getRoom();
            if (room) return room;
        }

        if (this.right) {
            const room = this.right.getRoom();
            if (room) return room;
        }

        return null;
    }    
}
//#endregion

//#region DUNGEON GENERATION
export const generateBSPDungeon = async(predefinedSeed?: string | number) => {
    let seed = 0

    if(predefinedSeed){
        if(typeof predefinedSeed === 'string') seed = hashString(predefinedSeed)
        else seed = predefinedSeed
    }else{
        seed = hashString('test' + Date.now())
    }

    const rng = createSeededRNG(seed)
    
    const MAP_WIDTH  = randBetween(rng.map(), 30, 60)
    const MAP_HEIGHT = randBetween(rng.map(), 30, 60)

    const MIN_LEAF_SIZE = randBetween(rng.map(), 12, 18)
    const MAX_LEAF_SIZE = randBetween(rng.map(), 22, 32)

    const MIN_ROOM_SIZE = randBetween(rng.map(), 6, 10)
    const MAX_ROOM_SIZE = randBetween(rng.map(), 12, 16)

    const root = new Leaf(0, 0, MAP_WIDTH, MAP_HEIGHT);
    const leaves = [root];

    console.log(root)

    // 1. Build a rough tilemap
    const grid = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(1)); // 1 = wall       

    // 2. Split until no more splitting possible
    let didSplit = true;
    while (didSplit) {
        didSplit = false;
        for (let i = 0; i < leaves.length; i++) {
            const leaf = leaves[i];
            if (leaf.left === null && leaf.right === null) {
                if (leaf.w > MAX_LEAF_SIZE || leaf.h > MAX_LEAF_SIZE || rng.map() > 0.75) {
                    const splitted = leaf.split(rng.map(), MIN_LEAF_SIZE)
                    if (!splitted) break

                    if(leaf.left && leaf.right){
                        leaves.push(leaf.left);
                        leaves.push(leaf.right);
                        didSplit = true;                            
                    }                    
                }
            }
        }
    }

    console.log(leaves)

    // 3. Create rooms
    leaves.forEach(leaf => {
        if (!leaf.left && !leaf.right) leaf.createRoom(grid, rng, MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    }); 

    // 4. Collect all rooms
    const rooms = leaves
        .filter(l => l.room)
        .map(l => l.room as roomNode);
    
    // 5. Connect rooms with corridors
    createCorridors(root, grid, rng)

    // 6. Draw graph
    for (const room of ROOMNODES) {
        // if(room.connections.size > 0){
        //     const leaf = leaves.find(l => l.room?.id === room.id)
        //     room.connections.forEach(connId => {
        //         setCorridor(leaf, room, ROOMNODES[connId], grid)
        //     })
            
        // }
        console.log(
            `Room ${room.id} → [${[...room.connections].join(", ")}]`
        );
    }

    await setProps(grid, rooms, rng)

    const graph = new Map<number, RoomNode>()

    ROOMNODES.forEach((room, index) => {
        graph.set(index, {
            id: index,
            room : {
                x: room.x,
                y: room.y,
                w: room.w,
                h: room.h,
                center: { ...room.center },
            },
            type: RoomType.SidePath,
            neighbors: new Set()
        })
    })

    console.log('graph', graph)

    leaves.forEach(leaf => {
        leaf.corridors.forEach(({x1, x2, y1, y2}) => {
            const a = findRoomAt(x1, y1, graph);
            const b = findRoomAt(x2, y2, graph);

            if (a !== null && b !== null && a !== b) {
                graph.get(a)!.neighbors.add(b);
                graph.get(b)!.neighbors.add(a);
            }
        });
    });

    const randomRoomId = Math.floor(rng.map() * rooms.length);

    const entranceSearch = findFarthestRoom(randomRoomId, ROOMNODES);
    const entranceId = entranceSearch.id;

    const exitSearch = findFarthestRoom(entranceId, ROOMNODES);
    const exitId = exitSearch.id;

    // 7. Assign room type
    graph.get(entranceId)!.type = RoomType.Entrance;
    graph.get(exitId)!.type = RoomType.Exit; 

    // Connect rooms if needed
    findConnectedRooms(grid, leaves, rng)
    // // Find dead-ends
    const deadEnds = findDeadEnds(graph)

    console.log('dead-ends', deadEnds)

    let entrance: { x: number, y: number } | null = { x: 0, y: 0 }
    let exit: { x: number, y: number } | null = { x: 0, y: 0 }

    if(rooms.length === 1){
        // Handle rare single room dungeon
        const roomRNG = rng.room(rooms[0].id)()
        const horizontal = roomRNG > 0.5

        if (horizontal) {

            const y = randBetween(roomRNG, rooms[0].y + 1, rooms[0].y + rooms[0].h - 2)

            entrance = { x: rooms[0].x, y }
            exit = { x: rooms[0].x + rooms[0].w - 1, y }

        } else {

            const x = randBetween(roomRNG, rooms[0].x + 1, rooms[0].x + rooms[0].w - 2)

            entrance = { x, y: rooms[0].y }
            exit = { x, y: rooms[0].y + rooms[0].h - 1 }

        }        

    }else{
        // Find entrance and exit
        const entranceRoom = ROOMNODES[entranceId];
        const exitRoom = ROOMNODES[exitId];

        entrance = entranceRoom !== null ? getValidDoorTiles(entranceRoom, grid, rng) : null
        exit = exitRoom !== null ? getValidDoorTiles(exitRoom, grid, rng) : null
    }
    
    const criticalPath = reconstructPath(
        entranceId,
        exitId,
        exitSearch.parent
    );

    // const criticalSet = new Set(criticalPath);    
    
    console.log("Entrance:", entranceId);
    console.log("Exit:", exitId);
    console.log("Critical path:", criticalPath.join(" → "));               

    // 8. Mark critical path rooms
    for (const id of criticalPath) {
        if (
            id !== entranceId &&
            id !== exitId
        ) {
            graph.get(id)!.type = RoomType.MainPath;
        }
    }    

    // 9. Mark dead-end reward rooms
    for (const [id, node] of graph) {
        if (
            node.neighbors.size === 1 &&
            node.type === RoomType.SidePath
        ) {
            node.type = RoomType.DeadEndReward;
        }
    }   

    // Exclude critical path rooms
    const rewardDeadEnds = deadEnds.filter(
        id => !criticalPath.includes(id)
    );

    console.log('rewardDeadEnds', rewardDeadEnds)

// TODO: Decorate dead-ends

    const { propRules } = getOptionValue()

    // Apply content per room (NOT per tile)
    for (const roomId of rewardDeadEnds) {
        if (roomId === entranceId) return;
        if (roomId === exitId) return;

        const room = graph.get(roomId)!.room;
        const type = rollDeadEndType(rng.room(roomId)());

        const { innerSpace, tiles } = getInnerSpaceAndTiles(grid, room)

        // decorateDeadEnd(room, type);
        // Add props
        switch(type){
            case DeadEndType.Treasure:
                placeChest(roomId, tiles, propRules.chest, rng)
            break;
            case DeadEndType.Breakables:
                placePot(innerSpace, roomId, tiles, propRules.pot, rng)   
            break;
        }
    }

    //#region enemy spawn rule 
    // Compute room depth
    const roomDepth = computeRoomDepths(entranceId, graph)

    if(roomDepth.size !== graph.size){
        console.warn("Some rooms are not reachable from the entrance!");

        [...graph.keys()].filter(id => {
            if(!roomDepth.has(id)){
                const unreachableDepths = computeRoomDepths(id, graph)
                for(const [id, depth] of unreachableDepths){
                    roomDepth.set(id, depth)
                }
            }
        });
    }

    console.log('roomDepth', roomDepth)

    // Decide spawn count
    const enemySpawnRule: ({ min: number, max: number }|null)[] = []
    graph.forEach(node => enemySpawnRule.push(getEnemySpawnRule(node)))
    // ROOMNODES.forEach(room => {
    //     const enemySpawnRule = getEnemySpawnRule(room.id, entranceId, exitId, criticalPath)

    console.log(`spawnRule: ${JSON.stringify(enemySpawnRule)}`)
    // })
    
    // Scale by depth
    const scaledEnemyRules = enemySpawnRule.map((rule, index) => {
        const depth = roomDepth.get(index)
        if(rule){
            return scaleEnemies(rule, depth, rng)
        }else{
            return null
        }
    }) 

    console.log('scaledEnemyRules', scaledEnemyRules)  

    // Build a room “spawn grid”
    ROOMNODES.forEach((room, index) => {
        placeEnemies(room, scaledEnemyRules[index]?? 0, grid, rng)
    })
    //#endregion  

    // #region Get polygon
    const edges = marchingSquares(grid)
    const polygon = buildPolygons(edges)

    polygon.forEach(poly => {
        const shape: Vec2[] = []
        poly.forEach(node => {
            shape.push(vec2(node.x, node.y))
        })
        nav.addPolygon(shape)
    })

    console.log('nav', nav)
    // #endRegion

    // Decide what kind of door the exit is
    const card = Math.floor(rng.door() * cardLimit)
    const door = {
        card: card? card : 1,
        type: Array.from({ length: card? card : 1 }).map((_, i) => {
            const rng = createLCG(hashString(seed + '_card_' + i))() 

            if(i > 0 && rng > 0.5){
                // Force to change card type
                const newIndex = Math.floor(createLCG(hashString(rng + '_card_' + i))() * CARDTYPE.length)

                console.log('newIndex', newIndex)
                return CARDTYPE[newIndex]
            }else{
                const index = Math.floor(rng * CARDTYPE.length)
                console.log('index', index)
               return CARDTYPE[index] 
            }            
        }) 
    }

    // Decide where to place doors
    if(entrance) await checkDoorPosition(grid, entrance)
    if(exit) await checkDoorPosition(grid, exit)    

    if(entrance && exit){
        gameStore.set(gameState, prev => ({
            ...prev,
            level: grid,
            entrance,
            exit,
            door,
            rng,
            enemies: ENEMY,
            roomNodes: ROOMNODES,
            polygon
        }))        
    }

    // You can return these or store them globally
    return { seed, grid, entrance, exit, door, polygon };
}
//#endregion

//#region Set props for chunks
const setProps = async(grid: number[][], rooms: room[], rng: rng) => {
    // const allProps: prop[] = []
    const { propRules } = getOptionValue()

    rooms.map((room, index) => {
        const { innerSpace, tiles } = getInnerSpaceAndTiles(grid, room)

        placePot(innerSpace, index, tiles, propRules.pot, rng)
        placeChest(index, tiles, propRules.chest, rng)
        placeShrine(index, tiles, propRules.shrine, rng)
    })

    placeDecoration(grid, propRules.decoration, rng)

    gameStore.set(gameState, prev => ({
        ...prev,
        props: PROP
    }))
}

const placePot = (
    innerSpace: { x: number, y:number, w: number, h: number }, 
    roomId: number, 
    tiles: {x: number, y: number}[], 
    rule: { density: number, min:number, max: number },
    rng: rng
) => {
    const { density, min, max } = rule
    const area = innerSpace.w * innerSpace.h
    const expected = area * density 
    const possibleCount = expected + (rng.props() * (1 - -1) + -1)
    const count = Math.min(Math.max(possibleCount, min), max)
    pushProp(roomId, count, 'pot', tiles, rng)
}

const placeChest = (
    roomId: number, 
    tiles: {x: number, y: number}[],
    rule: { perRoomChance: number, maxPerRoom: number },
    rng: rng
) => {
    const { perRoomChance, maxPerRoom } = rule
    const canSpawn = rng.props() <= perRoomChance
    const count = canSpawn? maxPerRoom : 0
    pushProp(roomId, count, 'chest', tiles, rng)
}

const placeDecoration = (
    grid: number[][], 
    rule: { perRoomChance: number, density: number },
    rng: rng
) => {
    const { density } = rule    
    const area = grid[0].length * grid.length
    const expected = area * density 
    const possibleCount = expected + (rng.props() * (1 - -1) + -1)
    const allFloorTiles = getFloorTiles(grid, { w: grid[0].length, h: grid.length, x:0, y: 0,  center: { x: 0, y: 0 } })

    for(let count=0; count < possibleCount; count++){
        const random = allFloorTiles[Math.floor(rng.props() * allFloorTiles.length)]
        grid[random.y][random.x] = 3
    }
}

const placeShrine = (
    roomId: number, 
    tiles: {x: number, y: number}[], 
    rule: { perFloorChance: number, maxPerRoom: number },
    rng: rng
) => {
    const { perFloorChance, maxPerRoom } = rule
    const canSpawn = rng.props() <= perFloorChance
    const count = canSpawn? maxPerRoom : 0
    pushProp(roomId, count, 'shrine', tiles, rng)
}

const pushProp = (
    roomId: number, 
    count: number, 
    type: string, 
    tiles: {x: number, y: number}[],
    rng: rng
) => {
    for(let i=0; i < count; i++){
        console.log(`set ${type} prop`)
        const random = tiles[Math.floor(rng.props() * tiles.length)]
        const prop = {
                type,
                x: random.x,
                y: random.y,
                roomId,
            } 

        switch(type){
            case 'pot':
                Object.defineProperty(prop, 'broken', { value: false, writable: true })
            break;
            case 'chest':
                Object.defineProperty(prop, 'open', { value: false, writable: true })
            break;
            case 'shrine':
                Object.defineProperty(prop, 'active', { value: false, writable: true })
            break;
        }

        PROP.push(prop)
    }  
}

const getFloorTiles = (grid: number[][], room: room) => {
    const tiles =[]

    for(let y= room.y; y < room.y + room.h; y++){
        for(let x=0; x < room.x + room.w; x++){
            if(grid[y][x] === 0) tiles.push({ x, y })
        }
    }

    return tiles
}
//#endregion
