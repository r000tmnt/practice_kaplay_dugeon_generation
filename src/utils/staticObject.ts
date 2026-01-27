import k from "../lib/kaplay"
import type { GameObj, Rect } from "kaplay";
import type { prop } from "../model/map"
import { setting, getOptionValue } from '../store/setting';

const { 
    area,
    body,
    get,
    sprite,
    pos
 } = k

export const spawnObject = (prop: prop, tileWidth: number, shape = {} as Rect) => {
    const map = get('map')
    let obj;
    switch(prop.type){
        case 'pot':
            if(!prop.broken){
                obj = map[0].add([
                    sprite('pot'),
                    pos(prop.x * tileWidth, prop.y * tileWidth),
                    area({ collisionIgnore: ["item"] }),
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
                    area({ collisionIgnore: ["item"] }),
                    body({ isStatic: true }),
                    {
                        open: prop.open,
                    },
                    // Tags
                    "chest"
                ])
            }
            break;
        case 'shrine':
            obj = map[0].add([
                sprite('shrine', { frame: prop.active? 1 : 0 }),
                pos(prop.x * tileWidth, prop.y * tileWidth),
                area({ collisionIgnore: ["item"] }),
                body({ isStatic: true }),
                {
                    active: prop.active,
                },
                // Tags
                "shrine"
            ])  
        break;            
        case 'wall':
            obj = map[0].add([
                pos(prop.x, prop.y),
                area({ shape, collisionIgnore: ["item"] }),
                body({ isStatic: true }),
                // opacity(0.5), // debug
                // color(0, 0, 255),
                "wall",                        
            ])
        break;  
    }

    if(obj) setObjectEvents(obj, prop)

    return obj
}

const setObjectEvents = (obj: GameObj, prop: prop) => {

    obj.onCollide('enemy', (enemy: GameObj) => {
        console.log('object collide with enemy', enemy)
        // If enemy is moving
        if(enemy.path.length || enemy.waypoints?.length){
            enemy.steering(obj)
        }else{
            enemy.enterState('idle')
        }
    })


    // switch(prop.type){
    //     case 'pot':
    //     break;
    //     case 'chest':
    //     break;
    // }
}