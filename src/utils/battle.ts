import type { GameObj } from "kaplay";
import k from "../lib/kaplay";

const { RNG } = k

export const calculateDamage = (attacker: GameObj, defender: GameObj) => {
    const { attribute } = attacker

    const baseDmg = Math.floor(attribute.physique * 1/5)
    const rng = new RNG(Date.now())
    const rate = rng.gen()
    const value = rate * baseDmg
    const values = [ Math.floor(rng.gen() * value), Math.floor(rng.gen() * value) ]
    const scale = {
        min: baseDmg + Math.min(...values),
        max: baseDmg + Math.max(...values)
    }
    let dmg = rng.genNumber(scale.min, scale.max)

    // TODO: Add gear & skill bonus
    if(attacker.equip.rightHand?.id){
        const { min, max } = attacker.equip.rightHand.dmg
        dmg += rng.genNumber(min, max)
    }

    // Calculate defence
    const baseDef = Math.floor(defender.attribute.physique * 1/10)

    const finalNumber = baseDef >= dmg? 1 : Math.floor(dmg - baseDef)

    // Calculate chance to hit and avoid
    const baseHitChance = attribute.agility * 7/10
    const baseAvoidChance = defender.attribute.agility * 1/10
    const baseCritChance = attribute.agility * 1/10
    const toHit = finalNumber * baseHitChance
    const toAvoid = finalNumber * baseAvoidChance   
    const toCrit = finalNumber * baseCritChance 
    const total = toHit + toAvoid + toCrit

    const chance = {
        toHit: toHit / total,
        toAvoid: toAvoid / total,
        toCrit: toCrit / total
    }

    // Sort to ascending order
    const sorted = Object.fromEntries(
        Object.entries(chance).sort(([, a], [, b]) => a-b)
    )

    console.log('chance', sorted)

    // Default to avoid
    const result = {
        hit: false,
        crit: false,
        dmg: 0,
    }

    for(let i=0, chances=Object.entries(sorted); i < chances.length; i++){
        const key = chances[i][0]
        if(rate <= chances[i][1]){
            if(key.includes('Hit')){
                result.hit = true
                result.dmg = finalNumber
            }

            if(key.includes('Crit')){
                result.hit = true
                result.crit = true
                result.dmg = Math.floor(finalNumber * 1.5)
            }            
            break
        }
    }

    return result
}