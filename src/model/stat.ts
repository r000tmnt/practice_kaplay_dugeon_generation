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
  level: number;
}