import type { GameObj, SpriteCurAnim } from "kaplay";
import k  from '../lib/kaplay'
import { setting, getOptionValue } from '../store/setting';

const { 
    area,
    anchor,
    Rect,
    pos,
    rotate,
    vec2,
 } = k

export const createHitBox = (unit: GameObj, direction: string, anim: SpriteCurAnim) => {
    const { tileWidth } = getOptionValue()

    // Temporary set to attack only
    // Check direction
    const size = { x:0, y:0, angle: 0 }

    switch(direction){
        case 'top':
            size.x = 0
            size.y = -((tileWidth / 2) + 5)
            size.angle = 90
        break;
        case 'down':
            size.x = 0
            size.y = tileWidth / 2   
            size.angle = 90                 
        break;
        case 'right':
            size.x = (tileWidth / 2) + 5
            size.y = 0
            size.angle = 0 
        break;
        case 'left':
            size.x = -(tileWidth / 2)
            size.y = 0
            size.angle = 0 
        break;        
    }


    const hitBox = unit.add([
        area({ shape: new Rect(vec2(0), 5, tileWidth)}),
        anchor('center'),
        pos(size.x, size.y),
        rotate(size.angle),
        // Tags
        "hitBox",
        anim.name
    ])

    setCollision(hitBox, anim)

    return hitBox
}

const setCollision = (hitBox: GameObj, anim: SpriteCurAnim) => {
    hitBox.onCollide('pot', (obj: GameObj) => {
        console.log(obj)
        // console.log(col)

        if(anim.name === 'attack' && anim.frameIndex === 2){
            if(!obj.break){
                obj.break = true
                obj.play('break')   
                // Drop items              
            }
        }

        // And more
    })      
}