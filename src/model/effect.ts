type attribute =
'hp' |
'mp' |
'physique' |
'mentality' |
'agility' |
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
'exp'

type effectParam = Record<attribute, number>

interface effect extends effectParam {
    time: number
}

export type {
    effect
}