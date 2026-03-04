import type { GameObj, Vec2 } from "kaplay"
import k from "../lib/kaplay"

const { vec2 } = k

export const setDirection = (unit: GameObj, destination: Vec2) => {
    const dist = {
        x: destination.x - unit.pos.x,
        y: destination.y - unit.pos.y
    }

    // console.log('setDirection dist', dist)

    unit.facing = dist.x > 0? 'right' : 'left'

    if(dist.y > (Math.abs(dist.x) * 2)) unit.facing = 'down'
    if(dist.y < 0 && Math.abs(dist.y) > (Math.abs(dist.x) * 2)) unit.facing = 'top'

    unit.flipX = dist.x > 0    
}

export const getPathAndFollow = (unit: GameObj, destination: Vec2) => {
    try {
        // Get path
        unit.path = unit.navigateTo(destination)
        if(unit.path?.length) {
            unit.waypoints = [unit.path[0]]
            unit.path.splice(0, 1)
            // Get direction relative to unit position
            setDirection(unit, unit.path[0])
            // if(dist.y > 0 && dist.x > 0 ) unit.facing = 'downRight'
            // if(dist.y > 0 && dist.x < 0 ) unit.facing = 'downleft'
            // if(dist.y < 0 && dist.x > 0 ) unit.facing = 'upRight'
            // if(dist.y < 0 && dist.x < 0 ) unit.facing = 'upleft'
            unit.play('walk')        
        }           
    } catch {
        // k.debug.error(error)
        // console.warn('pathfinding error', error)
        unit.waypoints = [destination]
        setDirection(unit, destination)
        unit.play('walk')  
    }
}

// Reference: https://stackoverflow.com/a/17411276/14173422
export const rotateXY = (center: Vec2, point: Vec2, angle: number) => {
    const radians = (Math.PI / 180) * angle,
        cos = Math.cos(radians),
        sin = Math.sin(radians),
        nx = (cos * (point.x - center.x)) + (sin * (point.y - center.y)) + center.x,
        ny = (cos * (point.y - center.y)) - (sin * (point.x - center.x)) + center.y;
    return vec2(nx, ny);
}

export const steering = (unit: GameObj, ObjectInSight: GameObj, tileWidth: number, level: number[][]) => {
    if(unit.waypoints?.length){
        const dist = {
            x: ObjectInSight.pos.x - unit.pos.x,
            y: ObjectInSight.pos.y - unit.pos.y
        }

        const currentPos = {
            x: Math.floor(unit.pos.x / tileWidth),
            y: Math.floor(unit.pos.y / tileWidth)
        }                    

        const distanceToTiles = Math.floor(200/tileWidth)

        // console.log('dist to object', dist)

        if(dist.x <= tileWidth && dist.y <= tileWidth){
            switch(unit.facing){
                case 'top': case 'down':{
                    // Check left and right
                    let blockLeft = 0
                    let blockRight = 0

                    for(let i=1; i <= distanceToTiles; i++){
                        if(level[currentPos.y][currentPos.x - i] !== undefined && level[currentPos.y][currentPos.x - i] === 1) {
                            blockLeft++
                        }

                        if(level[currentPos.y][currentPos.x + i] !== undefined && level[currentPos.y][currentPos.x + i] === 1) {
                            blockRight++
                        }
                    }

                    if(blockLeft < blockRight){
                        // Go left
                        const newPoint = rotateXY(vec2(unit.pos.x, unit.pos.y), vec2(ObjectInSight.pos.x, ObjectInSight.pos.y), (unit.facing === 'top')? 90 : -90)
                        console.log('newPoint left', newPoint)
                        unit.waypoints = [vec2(newPoint.x, newPoint.y)]
                        setDirection(unit, newPoint)
                    }else{
                        // Go right
                        const newPoint = rotateXY(vec2(unit.pos.x, unit.pos.y), vec2(ObjectInSight.pos.x, ObjectInSight.pos.y), (unit.facing === 'top')? -90 : 90)
                        console.log('newPoint right', newPoint)
                        unit.waypoints = [vec2(newPoint.x, newPoint.y)]
                        setDirection(unit, newPoint)
                    }
                }
                break;
                case 'left': case 'right':{
                    // Check top and down
                    let blockTop = 0
                    let blockDown = 0

                    for(let i=1; i <= distanceToTiles; i++){
                        if(level[currentPos.y - i] && level[currentPos.y - i][currentPos.x] !== undefined && level[currentPos.y - i][currentPos.x] === 1) {
                            blockTop++
                        }

                        if(level[currentPos.y + i] && level[currentPos.y + i][currentPos.x] !== undefined && level[currentPos.y + i][currentPos.x] === 1) {
                            blockDown++
                        }
                    }

                    if(blockTop < blockDown){
                        // Go top
                        const newPoint = rotateXY(vec2(unit.pos.x, unit.pos.y), vec2(ObjectInSight.pos.x, ObjectInSight.pos.y), (unit.facing === 'left')? -90 : 90)
                        console.log('newPoint top', newPoint)
                        unit.waypoints = [vec2(newPoint.x, newPoint.y)]
                        setDirection(unit, newPoint)
                    }else{
                        // Go down
                        const newPoint = rotateXY(vec2(unit.pos.x, unit.pos.y), vec2(ObjectInSight.pos.x, ObjectInSight.pos.y), (unit.facing === 'left')? 90 : -90)
                        console.log('newPoint down', newPoint)
                        unit.waypoints = [vec2(newPoint.x, newPoint.y)]
                        setDirection(unit, newPoint)
                    }
                }
                break;
            }
        }
    }
} 