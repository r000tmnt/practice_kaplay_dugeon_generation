type cardType = 'red' | 'blue' | 'green'

const cardLimit = 5

interface door {
    card: number,
    type: cardType[]
}

export type {
    door,
    cardType
}

export { cardLimit }