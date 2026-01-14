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

import type { room, roomNode, corridor, prop } from "../model/map";
import { RoomState } from '../model/map'

// Store
import { getOptionValue } from '../store/setting';
import { gameState, gameStore } from "../store/game";

const MAP_WIDTH = 60;
const MAP_HEIGHT = 40;
const MIN_LEAF_SIZE = 12;
const MAX_LEAF_SIZE = 24;
const MIN_ROOM_SIZE = 6;
const MAX_ROOM_SIZE = 20;
const CORRIDOR_WIDTH = 2;   // tiles

const PROP: prop[] = []
const ENEMY: prop[] = []
const ROOMNODES: roomNode[] = []

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

//#region Utils
const randBetween = (a: number, b: number) => {
    return Math.floor(Math.random() * (b - a + 1)) + a;
}

const setCorridor = (leaf: Leaf, roomA: roomNode, roomB: roomNode) => {
    const pointA = {
        x: randBetween(roomA.x, roomA.x + roomA.w - 1),
        y: randBetween(roomA.y, roomA.y + roomA.h - 1)
    };

    const pointB = {
        x: randBetween(roomB.x, roomB.x + roomB.w - 1),
        y: randBetween(roomB.y, roomB.y + roomB.h - 1)
    };

    // L-shaped corridor
    if (Math.random() > 0.5) {
        leaf.corridors.push({ x1: pointA.x, y1: pointA.y, x2: pointB.x, y2: pointA.y });
        leaf.corridors.push({ x1: pointB.x, y1: pointA.y, x2: pointB.x, y2: pointB.y });
    } else {
        leaf.corridors.push({ x1: pointA.x, y1: pointA.y, x2: pointA.x, y2: pointB.y });
        leaf.corridors.push({ x1: pointA.x, y1: pointB.y, x2: pointB.x, y2: pointB.y });
    }          
    roomA.connections.add(roomB.id)     
    roomB.connections.add(roomA.id)     
}

const createCorridors = (leaf: Leaf) => {
    if (leaf.left && leaf.right) {
        const roomA = leaf.left.getRoom();
        const roomB = leaf.right.getRoom();

        if(roomA && roomB) setCorridor(leaf, roomA, roomB)
    }

    if (leaf.left) createCorridors(leaf.left);
    if (leaf.right) createCorridors(leaf.right);    
}

const carveHorizontal = (map: number[][], y: number, x1: number, x2: number) => {
    const from = Math.min(x1, x2)
    const to   = Math.max(x1, x2)
    const half = Math.floor(CORRIDOR_WIDTH / 2)

    for (let x = from; x <= to; x++) {
        for(let dy = -half; dy < CORRIDOR_WIDTH - half; dy++){
            const dist = y + dy
            if (map[dist] !== undefined && dist > 0 && dist < (map.length - 1)) map[y + dy][x] = 0            
        }
    }
}

const carveVertical = (map: number[][], x: number, y1: number, y2: number) => {
    const from = Math.min(y1, y2)
    const to   = Math.max(y1, y2)
    const half = Math.floor(CORRIDOR_WIDTH / 2)

    for (let y = from; y <= to; y++) {
        for(let dx = -half; dx < CORRIDOR_WIDTH - half; dx++){
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

const getValidDoorTiles = (room: room, tilemap: number[][]) => {
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
        // Top left
        if(tilemap[y - 1][x] === 0 && tilemap[y][x - 1] === 0) x += 1
        // Top right
        if(tilemap[y - 1][x] === 0 && tilemap[y][x + 1] === 0) x -= 1
        // Down left
        if(tilemap[y + 1][x] === 0 && tilemap[y][x - 1] === 0) x += 1
        // Down right
        if(tilemap[y + 1][x] === 0 && tilemap[y][x + 1] === 0) x -= 1

        // Check if one side is walkable (corridor)
        for (const d of dirs) {
            const nx = x + d.dx;
            const ny = y + d.dy;
            if (isWalkable(nx, ny)) {
                candidates.push({ x, y });
                break;
            }
        }
    }

    for (let x = room.x; x < (room.x + room.w); x++) {
        checkAndAdd(x, room.y); // TOP
        checkAndAdd(x, (room.y + room.h) - 1); // BOTTOM
    }

    for (let y = room.y; y < (room.y + room.h); y++) {
        checkAndAdd(room.x, y); // LEFT
        checkAndAdd((room.x + room.w) - 1, y); // RIGHT
    }

    if (candidates.length === 0) return null; // No valid door

    return candidates[Math.floor(Math.random() * candidates.length)];    
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
    startId: number,
    graph: Map<number, RoomNode>
): Set<number> => {
    const visited = new Set<number>();
    const queue = [startId];

    visited.add(startId);

    let current = 0

    while (queue.length > 0) {
        try {
            current = queue.shift()!;
            for (const n of graph.get(current)!.neighbors) {
                if (!visited.has(n)) {
                    visited.add(n);
                    queue.push(n);
                }
            }            
        } catch {
            console.log(`Can't find id ${current}`)
        }
    }

    return visited;
}

const findNearestReachableRoom =(
    fromId: number,
    reachable: Set<number>,
    graph: Map<number, RoomNode>
) => {
    let best = null;
    let bestDist = Infinity;

    const from = graph.get(fromId)!.room;

    for (const id of reachable) {
        const to = graph.get(id)!.room;
        const dist = getManhattanDistance(from, to);
        if (dist < bestDist) {
            bestDist = dist;
            best = id;
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

const rollDeadEndType = () => {
    const r = Math.random();

    switch(r){
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
        w: room.w - margin * 2,
        h: room.h - margin * 2
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

const scaleEnemies = (base: { min: number, max: number }, depth: number) => {
    return Math.min(
        base.max,
        base.min + Math.floor(depth / 3)
    );
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

// Refernce: https://stackoverflow.com/a/46545530/14173422
const shuffle = (array: any[]) => {
    const shuffled = array.map(value => ({ value, sort: Math.random() }))
                    .sort((a, b) => a.sort - b.sort)
                    .map(({ value }) => value)

    return shuffled
}

const placeEnemies = (room: roomNode, count: number, tilemap: number[][]) => {
    let candidates = buildSpawnGrid(room, tilemap);
    candidates = shuffle(candidates)

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

        candidates.pop()
    }

    return candidates;
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
    split() {
        if (this.left !== null || this.right !== null) return false; // already split

        let splitH = Math.random() > 0.5; // split horizontally or vertically

        if (this.w > this.h && this.w / this.h >= 1.25) {
            splitH = false; // force vertical
        } else if (this.h > this.w && this.h / this.w >= 1.25) {
            splitH = true; // force horizontal
        }

        const max = (splitH ? this.h : this.w) - MIN_LEAF_SIZE;
        if (max <= MIN_LEAF_SIZE) return false; // too small to split    
        
        const splitPos = Math.floor(Math.random() * (max - MIN_LEAF_SIZE)) + MIN_LEAF_SIZE;

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
    createRoom() {
        const roomW = randBetween(MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, this.w - 2));
        const roomH = randBetween(MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, this.h - 2));

        const roomX = randBetween(this.x + 1, this.x + this.w - roomW - 1);
        const roomY = randBetween(this.y + 1, this.y + this.h - roomH - 1);

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
export const generateBSPDungeon = async() => {
    const root = new Leaf(0, 0, MAP_WIDTH, MAP_HEIGHT);
    const leaves = [root];

    console.log(root)

    // 1. Split until no more splitting possible
    let didSplit = true;
    while (didSplit) {
        didSplit = false;
        for (let i = 0; i < leaves.length; i++) {
            const leaf = leaves[i];
            if (leaf.left === null && leaf.right === null) {
                if (leaf.w > MAX_LEAF_SIZE || leaf.h > MAX_LEAF_SIZE || Math.random() > 0.75) {
                    const splited = leaf.split()
                    if (!splited) break

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

    // 2. Create rooms
    leaves.forEach(leaf => {
        if (!leaf.left && !leaf.right) leaf.createRoom();
    }); 

    // 3. Collect all rooms
    const rooms = leaves
        .filter(l => l.room)
        .map(l => l.room as room);
    
    // 4. Connect rooms with corridors
    createCorridors(root)

    // 5. Build final tilemap
    const grid = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(1)); // 1 = wall   
    

    // 6. Carve rooms
    leaves.forEach(leaf => {
        if (leaf.room) {
            for (let y = leaf.room.y + 1; y < (leaf.room.y + leaf.room.h) - 1; y++) {
                for (let x = leaf.room.x + 1; x < (leaf.room.x + leaf.room.w) - 1; x++) {
                    grid[y][x] = 0; // 0 = floor
                }
            }
        }
    });  


    // 7. Draw graph
    for (const room of ROOMNODES) {
        console.log(
            `Room ${room.id} → [${[...room.connections].join(", ")}]`
        );
    }

    const randomRoomId = Math.floor(Math.random() * (rooms.length - 1));

    const entranceSearch = findFarthestRoom(randomRoomId, ROOMNODES);
    const entranceId = entranceSearch.id;

    const exitSearch = findFarthestRoom(entranceId, ROOMNODES);
    const exitId = exitSearch.id;

    const criticalPath = reconstructPath(
        entranceId,
        exitId,
        exitSearch.parent
    );

    // const criticalSet = new Set(criticalPath);    
    
    console.log("Entrance:", entranceId);
    console.log("Exit:", exitId);
    console.log("Critical path:", criticalPath.join(" → "));   

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

    // 8. Assign room type
    graph.get(entranceId)!.type = RoomType.Entrance;
    graph.get(exitId)!.type = RoomType.Exit;

    // 9. Mark critical path rooms
    for (const id of criticalPath) {
        if (
            id !== entranceId &&
            id !== exitId
        ) {
            graph.get(id)!.type = RoomType.MainPath;
        }
    }    

    // 10. Mark dead-end reward rooms
    for (const [id, node] of graph) {
        if (
            node.neighbors.size === 1 &&
            node.type === RoomType.SidePath
        ) {
            node.type = RoomType.DeadEndReward;
        }
    }    

    const reachable = findConnectedRooms(entranceId, graph)

    console.log(reachable)

    const unreachable = [...graph.keys()]
        .filter(id => !reachable.has(id));  
        
    console.log(unreachable)

    unreachable.forEach(id => {
        const findNewPath = findNearestReachableRoom(id, reachable, graph)

        console.log(findNewPath)

        if(findNewPath){
            // Find the leaf
            const leaf = leaves.find(l => l.room?.id === findNewPath)
            // Carve a new corridor
            if(leaf){
                const roomA = leaves.find(l => l.room?.id === id)!.room
                const roomB = leaf.room

                if(roomA && roomB){
                    setCorridor(leaf, roomA, roomB)
                                        
                    // Update graph          
                    graph.get(id)!.neighbors.add(roomB.id);
                    graph.get(roomB.id)!.neighbors.add(id);
                    reachable.add(id);                              
                }
            }
        }
    })

    // Carve corridors
    leaves.forEach(leaf => {
        leaf.corridors.forEach(({x1, x2, y1, y2}) => {
            if(x1 === x2){
                carveVertical(grid, x1, y1, y2)
            }else
            if(y1 === y2){
                carveHorizontal(grid, y1, x1, x2)
            }
        });
    });    

    // Final check
    const finalReachable = findConnectedRooms(entranceId, graph);

    if (finalReachable.size !== graph.size) {
        console.warn("Dungeon still disconnected!");
    }

    // Find dead-ends
    const deadEnds = findDeadEnds(graph)

    console.log('dead-ends', deadEnds)

    // Exclude critical path rooms
    const rewardDeadEnds = deadEnds.filter(
        id => !criticalPath.includes(id)
    );

    console.log('rewardDeadEnds', rewardDeadEnds)

    // Apply content per room (NOT per tile)
    for (const roomId of rewardDeadEnds) {
        if (roomId === entranceId) return;
        if (roomId === exitId) return;

        const room = graph.get(roomId)!.room;
        const type = rollDeadEndType();

        const { innerSpace, tiles } = getInnerSpaceAndTiles(grid, room)

        // decorateDeadEnd(room, type);
        // Add props
        switch(type){
            case DeadEndType.Treasure:
                placeChest(roomId, tiles)   
            break;
            case DeadEndType.Breakables:
                placePot(innerSpace, roomId, tiles)   
            break;
        }
    }

    // Find entrance and exit
    const entranceRoom = ROOMNODES[entranceId];
    const exitRoom = ROOMNODES[exitId];

    const entrance = entranceRoom !== null ? getValidDoorTiles(entranceRoom, grid) : null
    const exit = exitRoom !== null ? getValidDoorTiles(exitRoom, grid) : null

    if(entrance) await checkDoorPosition(grid, entrance)
    if(exit) await checkDoorPosition(grid, exit)
    await setPorps(grid, rooms)

    //#region enemy spawn rule 
    // Compute room depth
    const roomDepth = computeRoomDepths(entranceId, graph)

    console.log('roomDepth', roomDepth)

    // Decide spawn count
    const enemySpawnRule: ({ min: number, max: number }|null)[] = []
    graph.forEach(node => enemySpawnRule.push(getEnemySpawnRule(node)))
    // ROOMNODES.forEach(room => {
    //     const enemySpawnRule = getEnemySpawnRule(room.id, entranceId, exitId, criticalPath)

    console.log(`spawmnRule: ${JSON.stringify(enemySpawnRule)}`)
    // })
    
    // Scale by depth
    const scaledEnemyRules = enemySpawnRule.map((rule, index) => {
        const depth = roomDepth.get(index)
        if(rule){
            return scaleEnemies(rule, depth)
        }else{
            return null
        }
    }) 

    console.log('scaledEnemyRules', scaledEnemyRules)  

    // Build a room “spawn grid”
    ROOMNODES.forEach((room, index) => {
        placeEnemies(room, scaledEnemyRules[index]?? 0, grid)
    })
    //#endregion  

    gameStore.set(gameState, prev => ({
        ...prev,
        enemies: ENEMY,
        roomNodes: ROOMNODES
    }))

    // You can return these or store them globally
    return { grid, rooms, entrance, exit };
}
//#endregion

//#region Set props for chunks
const setPorps = async(grid: number[][], rooms: room[]) => {
    // const allProps: prop[] = []

    rooms.map((room, index) => {
        const { innerSpace, tiles } = getInnerSpaceAndTiles(grid, room)

        placePot(innerSpace, index, tiles)
        placeChest(index, tiles)
    })

    gameStore.set(gameState, prev => ({
        ...prev,
        props: prev.props.concat(PROP)
    }))
}

const placePot = (innerSpace: { x: number, y:number, w: number, h: number }, roomId: number, tiles: {x: number, y: number}[]) => {
    const { propRules } = getOptionValue()
    const area = innerSpace.w * innerSpace.h
    const expected = area * propRules.pot.density 
    const possibleCount = expected + (Math.random() * (1 - -1) + -1)
    const count = Math.min(Math.max(possibleCount, 0), propRules.pot.max)

    for(let i=0; i < count; i++){
        const rng = tiles[Math.floor(Math.random() * (tiles.length - 1))]
        PROP.push(
            {
                type: "pot",
                x: rng.x,
                y: rng.y,
                roomId,
                broken: false
            }            
        )        
    }
}

const placeChest = (roomId: number, tiles: {x: number, y: number}[]) => {
    const { propRules } = getOptionValue()
    const canSpawn = Math.random() <= propRules.chest.perRoomChance
    const count = canSpawn? propRules.chest.maxPerRoom : 0

    for(let i=0; i < count; i++){
        console.log('set chest prop')
        const rng = tiles[Math.floor(Math.random() * (tiles.length - 1))]
        PROP.push(
            {
                type: "chest",
                x: rng.x,
                y: rng.y,
                roomId,
                open: false
            }            
        )
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
//#endrefion
