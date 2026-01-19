import k from "../lib/kaplay"
import type { GameObj } from "kaplay";
import type { prop } from "../model/map"
import { setting, getOptionValue } from '../store/setting';

const { 
    area,
    body,
    get,
    sprite,
    pos
 } = k

export const spawnObject = (prop: prop, tileWidth: number) => {
    const map = get('map')
    let obj;
    switch(prop.type){
        case 'pot':
            if(prop.broken){
                obj = map[0].add([
                    sprite('pot', { frame: 2 }),
                    pos(prop.x * tileWidth, prop.y * tileWidth),
                    // Tags
                    "pot"
                ])
            }else{
                obj = map[0].add([
                    sprite('pot'),
                    pos(prop.x * tileWidth, prop.y * tileWidth),
                    area(),
                    body({ isStatic: true }),
                    {
                        broken: prop.broken,
                        // item: {
                        //         credit: {
                        //             min: 1,
                        //             max: 10
                        //         },

                        //     }
                    },
                    // Tags
                    "pot"
                ])                
            }
            break   
        case 'chest':
            if(prop.open){
                obj = map[0].add([
                    sprite('item', { frame: 4 }),
                    pos(prop.x * tileWidth, prop.y * tileWidth),
                    {
                        open: prop.open,
                    },
                    // Tags
                    "chest"
                ])
            }else{
                obj = map[0].add([
                    sprite('item', { frame: 3 }),
                    pos(prop.x * tileWidth, prop.y * tileWidth),
                    area(),
                    body({ isStatic: true }),
                    {
                        open: prop.open,
                        // item: {
                        //         credit: {
                        //             min: 1,
                        //             max: 10
                        //         },

                        //     }
                    },
                    // Tags
                    "chest"
                ])
            }
            break;
    }

    if(obj) setObjectEvents(obj, prop)

    return obj
}

const setObjectEvents = (obj: GameObj, prop: prop) => {
    const { tileWidth } = getOptionValue()

    obj.onCollide('enemy', (enemy: GameObj) => {
        console.log('object collide with enemy', enemy)
        // If enemy is moving
        if(enemy.path.length){
            // Get current enemy direction
            switch(enemy.facing){
                case 'downLeft':
                    // Set on a different path away from the object
                    enemy.waypoints = [{ x: obj.pos.x + tileWidth, y: obj.pos.y }, { x: obj.pos.x + tileWidth, y: obj.pos.y + tileWidth }]
                break;
                case 'downRight':
                    // Set on a different path away from the object
                    enemy.waypoints = [{ x: obj.pos.x - tileWidth, y: obj.pos.y }, { x: obj.pos.x - tileWidth, y: obj.pos.y + tileWidth }]                    
                break;          
                case 'upLeft':
                    // Set on a different path away from the object
                    enemy.waypoints = [{ x: obj.pos.x + tileWidth, y: obj.pos.y }, { x: obj.pos.x + tileWidth, y: obj.pos.y - tileWidth }]                    
                break;  
                case 'upRight':
                    // Set on a different path away from the object
                    enemy.waypoints = [{ x: obj.pos.x - tileWidth, y: obj.pos.y }, { x: obj.pos.x - tileWidth, y: obj.pos.y - tileWidth }]                    
                break;                                    
            }
        }
    })


    // switch(prop.type){
    //     case 'pot':
    //     break;
    //     case 'chest':
    //     break;
    // }
}