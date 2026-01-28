import type { GameObj, SpriteCurAnim } from "kaplay";
import k  from '../lib/kaplay'
import { gameState, gameStore, getGameStoreValue } from '../store/game';
import { setting, getOptionValue } from '../store/setting';
import { dropItem } from './item'
import { getPlayers } from "./player";
import { calculateDamage } from './battle'

const { 
    area,
    anchor,
    // Asset,
    // canvas,
    // get,
    pos,
    Rect,
    rotate,
    tween,
    vec2,
    wait
 } = k

export const createHitBox = (unit: GameObj, direction: string, anim: SpriteCurAnim, type: string, ignore: string[] = []) => {
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
            isSensor: true,
            collisionIgnore: ignore
        }),
        anchor('center'),
        pos(size.x, size.y),
        rotate(size.angle),
        {
            anim: anim.name
        },
        // Tags
        "hitBox"
    ])

    console.log('hitBox created', hitBox)

    if(type === 'collide') setCollision(hitBox, anim)
    // if(type === 'overlap') setOverlap(hitBox, anim)

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

        if(!obj.broken){
            obj.broken = true
            obj.unuse('body')  
            obj.play('break')
            // Update props
            const pot = props.findIndex(prop => prop.type === 'pot' && prop.x === (obj.pos.x / tileWidth) && prop.y === (obj.pos.y / tileWidth))
            props[pot].broken = true
            gameStore.set(gameState, prve => ({
                ...prve,
                props: props
            }))
            // Drop items  
            dropItem(obj, 'pot')

            // And more     
            wait(1, () => obj.destroy())             
        }     
    })  

    hitBox.onCollide('chest', (obj: GameObj) => {
        console.log(obj)
        
        if(!obj.open){
            obj.open = true
            obj.play('open') 
            // Update props
            const chest = props.findIndex(prop => prop.type === 'chest' && prop.x === (obj.pos.x / tileWidth) && prop.y === (obj.pos.y / tileWidth))
            props[chest].open = true
            gameStore.set(gameState, prve => ({
                ...prve,
                props: props
            }))
            // Drop items         
            dropItem(obj, 'chest')
            // And more            
        }           
    })    
    
    hitBox.onCollide('shrine', (obj: GameObj) => {
        console.log(obj)
        
        if(!obj.active){
            obj.active = true
            obj.frame = 1
            // Update props
            const shrine = props.findIndex(prop => prop.type === 'shrine' && prop.x === ((obj.pos.x - (tileWidth /2)) / tileWidth) && prop.y === ((obj.pos.y - (tileWidth / 2)) / tileWidth))
            props[shrine].active = true
            gameStore.set(gameState, prve => ({
                ...prve,
                props: props
            }))

            // And more            
        }        
    })        

    hitBox.onCollide('enemy', (obj: GameObj) => {
        console.log(obj)

        if(obj.defeat || obj.hp <= 0) return
        
        obj.waypoints?.splice(0)

        const player = getPlayers()[0]

        // Calculate damage
        if(hitBox.anim === 'attack'){
            const { hit, dmg } = calculateDamage(player, obj)
            const textHolder = obj.get('text')[0]

            if(textHolder){
                if(hit){
                    obj.hp -= dmg
                    // Display dmg number
                    textHolder.text = String(dmg)
                }else{
                    textHolder.text = "MISS"
                }                 
                
                // Animate text scale number
                tween(
                    textHolder.textTransform.scale,
                    textHolder.textTransform.scale + 1,
                    1,
                    (scale) => textHolder.textTransform.scale = scale
                ).onEnd(() => {
                    textHolder.textTransform.scale -= 1
                    textHolder.text= ''
                })                    
            }
        }
    })        
    
    hitBox.onCollide('player', (obj: GameObj) => {
        console.log('player get hit', obj)
        console.log('enemy', hitBox.parent)

        if(obj.hp <= 0) return

        // Calculate damage
        // if(hitBox.anim === 'attack'){
        //     const { hit, dmg } = calculateDamage(player, obj)

        //     if(hit){
        //         obj.hp -= dmg
        //     }else{
        //         // TODO: Display text "Miss"
        //     }
        // }
    })            
}

// const setOverlap = (hitBox: GameObj, anim: SpriteCurAnim) => {
//     const { props } = getGameStoreValue()
//     const { tileWidth } = getOptionValue()

//     hitBox.isOverlapping('pot', (obj: GameObj) => {
//         console.log(obj)
//         obj.broken = true
//         obj.play('break')  
//         obj.unuse('area')
//         obj.unuse('body')
//         // Update props
//         const pot = props.findIndex(prop => prop.type === 'pot' && prop.x === (obj.pos.x / tileWidth) && prop.y === (obj.pos.y / tileWidth))
//         props[pot].broken = true
//         gameStore.set(gameState, prve => ({
//             ...prve,
//             props: props
//         }))
//         // Drop items         

//         // And more        
//     })

//     hitBox.isOverlapping('chest', (obj: GameObj) => {
//         console.log(obj)
//         obj.broken = true
//         obj.play('open') 
//         // Update props
//         const chest = props.findIndex(prop => prop.type === 'chest' && prop.x === (obj.pos.x / tileWidth) && prop.y === (obj.pos.y / tileWidth))
//         props[chest].open = true
//         gameStore.set(gameState, prve => ({
//             ...prve,
//             props: props
//         }))
//         // Drop items         

//         // And more            
//     })    

//     hitBox.isOverlapping('enemy', (obj: GameObj) => {
//         console.log(obj)

//         if(!obj.active || obj.hp <= 0) return

//         obj.hp -= 2;

//         if(obj.hp <= 0){
//             obj.play('lose', {
//                 onEnd: () => {
//                     console.log('lose animation ended')
//                 }
//             })
//             return
//         }

//         obj.play('hurt', {
//             onEnd: () => {
//                 console.log('enemy hp', obj.hp)
//             }
//         })             
//     })        

//     hitBox.isOverlapping('player', (obj: GameObj) => {
//         console.log(obj)

//         if(!obj.active || obj.hp <= 0) return

//         obj.hp -= 2;

//         if(obj.hp <= 0){
//             obj.play('lose', {
//                 onEnd: () => {
//                     console.log('lose animation ended')
//                 }
//             })
//             return
//         }

//         obj.play('hurt', {
//             onEnd: () => {
//                 console.log('enemy hp', obj.hp)
//             }
//         })             
//     })            
// }
