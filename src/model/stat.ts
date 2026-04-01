import type { item } from "./item"

type attribute = 
'hp' |
'mp' |
'physique' |
'mentality' |
'agility' |
'crit'

type element =
'fire' |
'water' |
'earth' |
'wind' |
'electric' |
'spirit' |
'brute' |
'confusion' |
'numb' |
'bleeding'

type secondary =
'attack_speed' |
'move_speed' |
'cast_speed' |
'armor'

type effect = 
'size' |
'enemy' |
'room' |
'item_find_rate' |
'attack_speed' |
'move_speed' |
'cast_speed' |
'attack' |
'defense' |
'crit_rate' |
'max_hp' |
'max_mp'

type require = 
'lv' |
'physique' |
'mentality' |
'agility' 

export type Attribute = Partial<Record<attribute, number>>

export type Element = Partial<Record<element, number>> 

export type Secondary = Partial<Record<secondary, number>> 

export type Effect = Partial<Record<effect, number>> 

export type Require = Partial<Record<require, number>> 

export interface MaxStats {
  hp: number;
  mp: number;
  fire: number;
  water: number;
  wind: number;
  earth: number;
  electric: number;
  spirit: number;
  brute: number;
  confusion: number;
  numb: number;
  bleeding: number;
  exp: number;
  lv: number;
}

export interface Stat {
  attribute: {
    hp: number,
    mp: number,
    physique: number,
    mentality: number,
    agility: number
  },
  secondary: {
      attack_speed: number,
      move_speed: number,
      cast_speed: number,
      armor: number
  },
  resist: {
      fire: number,
      water: number,
      wind: number,
      earth: number,
      electric: number,
      spirit: number,
      brute: number,
      confusion: number,
      numb: number,
      bleeding: number
  },
  max: MaxStats,
  equip: {
    head: item | object,
    body: item | object,
    feet: item | object,
    accessory1: item | object,
    rightHand: item | object,
    leftHand: item | object,
    accessory2: item | object,
    ring: item
  },
  lv: number,
  pt: number,
  exp: number
}