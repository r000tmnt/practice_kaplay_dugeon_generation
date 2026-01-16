import type { GameObj, SpriteCurAnim } from "kaplay";
import k  from '../lib/kaplay'
import { gameState, gameStore, getGameStoreValue } from '../store/game';
import { setting, getOptionValue } from '../store/setting';

const { 
    area,
    anchor,
    get,
    Rect,
    pos,
    rotate,
    vec2,
 } = k

export const createHitBox = (unit: GameObj, direction: string, anim: SpriteCurAnim, ignore: string[] = []) => {
    const { tileWidth } = getOptionValue()

    // Temporary set to attack only
    // Check direction
    const size = { x:0, y:0, angle: 0 }

    switch(direction){
        case 'top':
            size.x = 0
            size.y = -((tileWidth / 2) + 10)
            size.angle = 90
        break;
        case 'down':
            size.x = 0
            size.y = tileWidth / 2   
            size.angle = 90                 
        break;
        case 'right':
            size.x = (tileWidth / 2) + 10
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
        area({ 
            shape: new Rect(vec2(0), 10, tileWidth),
            collisionIgnore: ignore
        }),
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

/**
 * Set hitbox onCollde event
 * @param hitBox - {GameObj} The hitbox itself
 * @param anim - {string} Name of the current animation
 */
const setCollision = (hitBox: GameObj, anim: SpriteCurAnim) => {
    const { props } = getGameStoreValue()
    const { tileWidth } = getOptionValue()

    hitBox.onCollide('pot', (obj: GameObj) => {
        console.log(obj)
        obj.broken = true
        obj.play('break')  
        obj.unuse('area')
        obj.unuse('body')
        // Update props
        const pot = props.findIndex(prop => prop.type === 'pot' && prop.x === (obj.pos.x / tileWidth) && prop.y === (obj.pos.y / tileWidth))
        props[pot].broken = true
        gameStore.set(gameState, prve => ({
            ...prve,
            props: props
        }))
        // Drop items         

        // And more
    })      

    hitBox.onCollide('chest', (obj: GameObj) => {
        console.log(obj)
        obj.broken = true
        obj.play('open') 
        // Update props
        const chest = props.findIndex(prop => prop.type === 'chest' && prop.x === (obj.pos.x / tileWidth) && prop.y === (obj.pos.y / tileWidth))
        props[chest].open = true
        gameStore.set(gameState, prve => ({
            ...prve,
            props: props
        }))
        // Drop items         

        // And more
    })          

    hitBox.onCollide('enemy', (obj: GameObj) => {
        console.log(obj)

        if(!obj.active || obj.hp <= 0) return

        obj.hp -= 2;

        if(obj.hp <= 0){
            obj.play('lose', {
                onEnd: () => {
                    console.log('lose animation ended')
                }
            })
            return
        }

        obj.play('hurt', {
            onEnd: () => {
                console.log('enemy hp', obj.hp)
            }
        }) 
    })        
    
    hitBox.onCollide('player', (obj: GameObj) => {
        console.log('player get hit', obj)

        // if(!obj.active || obj.hp <= 0) return

        // obj.hp -= 2;

        // if(obj.hp <= 0){
        //     obj.play('lose', {
        //         onEnd: () => {
        //             console.log('lose animation ended')
        //         }
        //     })
        //     return
        // }

        // obj.play('hurt', {
        //     onEnd: () => {
        //         console.log('enemy hp', obj.hp)
        //     }
        // }) 
    })            
}