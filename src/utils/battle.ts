import type { GameObj } from "kaplay";
import k from "../lib/kaplay";

const { RNG } = k

export const calculateDamage = (attacker: GameObj, defender: GameObj) => {
    const { attribute } = attacker

    // TODO: Add gear & skill bonus
    const baseDmg = Math.floor(attribute.physique * 1/5)
    const rng = new RNG(Date.now())
    const rate = rng.gen()
    const value = rate * baseDmg
    const values = [ Math.floor(Math.random() * value), Math.floor(Math.random() * value) ]
    const scale = {
        min: baseDmg + Math.min(...values),
        max: baseDmg + Math.max(...values)
    }
    const dmg = rng.genNumber(scale.min, scale.max)

    // Calculate defence
    const baseDef = Math.floor(defender.attribute.physique * 1/10)

    const finalNumber = baseDef > dmg? 1 : dmg - baseDef

    // Calculate chance to hit and avoid
    const baseHithance = attribute.agility * 7/10
    const baseAvoidChance = defender.attribute.agility * 1/10
    const baseCritChance = attribute.agility * 1/10
    const toHit = finalNumber * baseHithance
    const toAvoid = finalNumber * baseAvoidChance   
    const toCrit = finalNumber * baseCritChance 
    const total = toHit + toAvoid + toCrit

    const chance = {
        toHit: toHit / total,
        toAvoid: toAvoid / total,
        toCrit: toCrit / total
    }

    console.log('chance', chance)

    if(rate <= chance.toCrit){
        return {
            hit: true,
            dmg: Math.round(finalNumber * 1.5),
        }
    }

    if(rate <= chance.toHit){
        return {
            hit: true,
            dmg: finalNumber,
        }
    }else{
        return {
            hit: false,
            dmg: 0
        }
    }
}