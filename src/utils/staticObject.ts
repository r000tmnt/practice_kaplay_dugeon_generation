import k from "../lib/kaplay"
import { type GameObj, type Rect } from "kaplay";
import type { prop } from "../model/map"
// import { setting, getOptionValue } from '../store/setting';

const { 
    area,
    anchor,
    body,
    get,
    layer,
    sprite,
    pos,
    vec2,
 } = k

export const spawnObject = (prop: prop, tileWidth: number, shape?: Rect) => {
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
                pos((prop.x * tileWidth) + (tileWidth / 2), (prop.y * tileWidth) + (tileWidth / 2)),
                layer('fg'),
                area({ shape: new k.Rect(
                    vec2(0),
                    tileWidth,
                     tileWidth
                ), collisionIgnore: ["item"] }),
                anchor('center'),
                body({ isStatic: true }),
                {
                    active: prop.active,
                },
                // Tags
                "shrine"
            ])  
        break;            
        case 'wall': case 'entrance': case 'exit':
            obj = map[0].add([
                pos(prop.x, prop.y),
                area({ shape, collisionIgnore: ["item"] }),
                body({ isStatic: true }),
                // opacity(0.5), // debug
                // color(0, 0, 255),
                prop.type,                        
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


    obj.onCollide('player', (player: GameObj) => {
        if(obj.sprite === 'shrine'){
            console.log('shrine', obj)
            if(player.pos.y >= obj.pos.y){
                obj.layer = 'game'
            }else{
                obj.layer = 'fg'
            }
        }

        if(obj.is('entrance')){
            return
        }

        if(obj.is('exit')){
            // And More
        }
    })
}