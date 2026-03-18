type cardType = 'red' | 'blue' | 'green'

type cardLimit = 5

interface door {
    card: number,
    type: cardType[]
}

export type {
    door,
    cardLimit
}