type attribute =
'hp' |
'mp' |
'physique' |
'mentality' |
'agility' |
'move_speed' |
'attack_speed' |
'cast_speed' |
'fire' |
'water' |
'wind' |
'earth' |
'electric' |
'spirit' |
'brute' |
'confusion' |
'numb' |
'bleeding' |
'dmg' |
'exp' |
'item_find_rate' |
'size' |
'enemy' |
'attack' |
'defense' |
'crit_rate' |
'max_hp' |
'max_mp' |
'all'

type effectParam = Record<attribute, number>

interface effect extends effectParam {
    time: number
}

export type {
    effect
}