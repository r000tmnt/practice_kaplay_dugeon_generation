import type { GameObj, SpriteCurAnim } from "kaplay";
import k  from '../lib/kaplay'
import { gameState, gameStore, getGameStoreValue, effectAtom } from '../store/game';
import { getOptionValue } from '../store/setting';
import { prepareItemsToDrop } from './item'
import { getPlayers } from "./player";
import { calculateDamage } from './battle'
import potData from '../data/pot.json'
import chestData from '../data/chest.json'
import { setEffectTimer, setCardUI } from '../components/UI'

const { 
    add,
    area,
    anchor,
    // Asset,
    // canvas,
    // get,
    lifespan,
    opacity,
    pos,
    Rect,
    rgb,
    rotate,
    text,
    tween,
    vec2,
    wait
 } = k

const onHitEvent = (hitBox: GameObj, attacker: GameObj, defender: GameObj) => {
    // Calculate damage
    if(hitBox.anim === 'attack'){
        if(defender.defeat || defender.hp <= 0) return

        const { hit, dmg, crit } = calculateDamage(attacker, defender)

        const { tileWidth } = getOptionValue()

        const textHolder = add([
            text(String(dmg), {
                size: tileWidth / 4,
                styles: {
                    "yellow": {
                        color: rgb(200, 86, 10)
                    }
                }
            }),
            lifespan(0.5, { fade: 0.25 }),
            pos(defender.pos.x, defender.pos.y - (tileWidth / 2) - 10),
            anchor('center'),
            opacity(1),
            'text'
        ])

        if(hit){
            // Do not let hp go below 0
            defender.hp -= (dmg > defender.hp)? defender.hp : dmg
            defender.attribute.hp = defender.hp
            // Display dmg number
            if(crit){
                textHolder.text = `[yellow]${dmg}[/yellow]`
                textHolder.textSize = Math.floor(textHolder.textSize * 1.5)
            }
        }else{
            textHolder.text = "MISS"
        }                 
        
        // Animate text pos
        tween(
            textHolder.pos.y,
            textHolder.pos.y - 10,
            0.25,
            (pos) => { textHolder.pos.y = pos }
        )
    }    
}

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
            anim: anim.name,
            limit: 0,
            lockOn: '' as string | string[]
        },
        // Tags
        "hitBox"
    ]) as GameObj 

    // Limit the number of target
    if(anim.name === 'attack') hitBox.limit = 1

    // console.log('hitBox created', hitBox)

    if(type === 'collide') setCollision(hitBox)
    // if(type === 'overlap') setOverlap(hitBox, anim)

    return hitBox
}

/**
 * Set hitBox onCollide event
 * @param hitBox - {GameObj} The hitBox itself
 * @param anim - {string} Name of the current animation
 */
const setCollision = (hitBox: GameObj) => {
    const { tileWidth } = getOptionValue()

    hitBox.onCollide('pot', (obj: GameObj) => {
        // console.log(obj)
        const { props } = getGameStoreValue()

        if(!obj.broken){
            obj.broken = true
            obj.unuse('body')  
            obj.play('break')
            // Update props
            const pot = props.findIndex(prop => prop.type === 'pot' && prop.x === (obj.pos.x / tileWidth) && prop.y === (obj.pos.y / tileWidth))
            if(pot >= 0){
                props[pot].broken = true
                gameStore.set(gameState, prve => ({
                    ...prve,
                    props: props
                }))                
            }

            // Drop items  
            prepareItemsToDrop(obj, potData.base)

            // And more     
            wait(1, () => obj.destroy())             
        }     
    })  

    hitBox.onCollide('chest', (obj: GameObj) => {
        // console.log(obj)
        const { props } = getGameStoreValue()
        
        if(!obj.open){
            obj.open = true
            obj.play('open') 
            // Update props
            const chest = props.findIndex(prop => prop.type === 'chest' && prop.x === (obj.pos.x / tileWidth) && prop.y === (obj.pos.y / tileWidth))
            if(chest >= 0) {
                props[chest].open = true
                gameStore.set(gameState, prev => ({
                    ...prev,
                    props: props
                }))
            }
            // Drop items         
            prepareItemsToDrop(obj, chestData.base)
            // And more            
        }           
    })    
    
    hitBox.onCollide('shrine', (obj: GameObj) => {
        // console.log(obj)
        const { props } = getGameStoreValue()
        
        if(!obj.active){
            obj.active = true
            obj.frame = 1
            // Update props
            const shrine = props.findIndex(prop => prop.type === 'shrine' && prop.x === ((obj.pos.x - (tileWidth /2)) / tileWidth) && prop.y === ((obj.pos.y - (tileWidth / 2)) / tileWidth))
            
            if(shrine >= 0){
                props[shrine].active = true
                gameStore.set(gameState, prev => ({
                    ...prev,
                    props: props
                }))                
            }

            // And more       
            if(obj.shrine.effect){
                const { effect } = getGameStoreValue()

                effect.push(JSON.parse(JSON.stringify(obj.shrine.effect)))

                gameStore.set(effectAtom, effect)

                setEffectTimer(obj.shrine.effect)
            }
        }        
    })        

    hitBox.onCollide('enemy', (obj: GameObj) => {
        console.log(obj)

        if(obj.defeat || obj.hp <= 0) return
        
        obj.waypoints?.splice(0)

        const player = getPlayers()[0]

        onHitEvent(hitBox, player, obj)
    })        
    
    hitBox.onCollide('player', (obj: GameObj) => {
        console.log('player get hit', obj)
        console.log('enemy', hitBox.parent)

        if(obj.hp <= 0) return

        if(hitBox.parent) onHitEvent(hitBox, hitBox.parent, obj)
    })    

    hitBox.onCollide('exit', () => {
        if(hitBox.anim === 'attack'){
            // Display UI to set map card 
            console.log('exit!')
            setCardUI(true)
        }
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
