/**
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

import type { room, corridor } from "../model/map";

const MAP_WIDTH = 35;
const MAP_HEIGHT = 25;
const MIN_LEAF_SIZE = 12;
const MAX_LEAF_SIZE = 24;
const MIN_ROOM_SIZE = 6;
const MAX_ROOM_SIZE = 20;

//#region Utils
const randBetween = (a: number, b: number) => {
    return Math.floor(Math.random() * (b - a + 1)) + a;
}

const createCorridors = (leaf: Leaf) => {
    if (leaf.left && leaf.right) {
        const roomA = leaf.left.getRoom();
        const roomB = leaf.right.getRoom();

        if(roomA && roomB){
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
        }
    }

    if (leaf.left) createCorridors(leaf.left);
    if (leaf.right) createCorridors(leaf.right);    
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
//#endregion

//#region Leaf node
class Leaf{
    x: number;
    y: number;
    w: number;
    h: number;
    left: null|Leaf;
    right: null|Leaf;
    room: null|room;
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

        this.room = { x: roomX, y: roomY, w: roomW, h: roomH, center: { 
            x: roomX + Math.floor(roomW / 2), 
            y: roomY + Math.floor(roomH / 2) 
        } };
    }    

    // Get a room somewhere inside this leaf (going down tree if needed)
    getRoom(): null|{x: number, y: number, w: number, h: number} {
        if (this.room) return this.room;
        let lRoom = null;
        let rRoom = null;

        if (this.left) lRoom = this.left.getRoom();
        if (this.right) rRoom = this.right.getRoom();

        if (!lRoom && !rRoom) return null;
        else if (!rRoom) return lRoom;
        else if (!lRoom) return rRoom;
        else return Math.random() > 0.5 ? lRoom : rRoom;
    }    
}
//#endregion

//#region DUNGEON GENERATION
export const generateBSPDungeon = async() => {
    const root = new Leaf(0, 0, MAP_WIDTH, MAP_HEIGHT);
    const leaves = [root];

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

    // 2. Create rooms
    leaves.forEach(leaf => {
        if (!leaf.left && !leaf.right) leaf.createRoom();
    }); 
    
    // 3. Connect rooms with corridors
    createCorridors(root)

    // 4. Build final tilemap
    const grid = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(1)); // 1 = wall   
    
    // Carve rooms
    leaves.forEach(leaf => {
        if (leaf.room) {
            for (let y = leaf.room.y + 1; y < (leaf.room.y + leaf.room.h) - 1; y++) {
                for (let x = leaf.room.x + 1; x < (leaf.room.x + leaf.room.w) - 1; x++) {
                    grid[y][x] = 0; // 0 = floor
                }
            }
        }
    });    

    // Carve corridors
    leaves.forEach(leaf => {
        leaf.corridors.forEach(c => {
            const dx = Math.sign(c.x2 - c.x1);
            const dy = Math.sign(c.y2 - c.y1);

            let x = c.x1;
            let y = c.y1;

            while (x !== c.x2 || y !== c.y2) {
                grid[y][x] = 0;
                if (x !== c.x2) x += dx;
                if (y !== c.y2) y += dy;
            }
            grid[c.y2][c.x2] = 0;
        });
    });

    // Collect all rooms
    const rooms = leaves
        .filter(l => l.room)
        .map(l => l.room as room);

    let entranceRoom = null;
    let exitRoom = null;
    let maxDist = -Infinity;

    for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
            const d = getManhattanDistance(rooms[i], rooms[j]);
            if (d > maxDist) {
                maxDist = d;
                entranceRoom = rooms[i];
                exitRoom = rooms[j];
            }
        }
    }

    const entrance = entranceRoom !== null ? getValidDoorTiles(entranceRoom, grid) : null
    const exit = exitRoom !== null ? getValidDoorTiles(exitRoom, grid) : null

    if(entrance) await checkDoorPosition(grid, entrance)
    if(exit) await checkDoorPosition(grid, exit)

    // You can return these or store them globally
    return { grid, rooms, entrance, exit };
}
//#endregion
