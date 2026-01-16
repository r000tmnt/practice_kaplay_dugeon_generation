import { createStore, atom } from "jotai";
import type { chunk, prop, room, roomNode } from "../model/map";

export const gameState = atom({
    level: [] as number[][][],
    rooms: [] as room[][],
    entrances: [] as { x: number, y: number }[],
    exits: [] as { x: number, y: number }[],
    props: [] as prop[],
    chunks: {} as Record<string, chunk>,
    enemies: [] as prop[],
    roomNodes: [] as roomNode[]
})

export const gameStore = createStore()

export const getGameStoreValue = () => {
    return gameStore.get(gameState)
}

gameStore.sub(gameState, () => {
    // const newValue = getGameStoreValue()
    // console.log('gameStore update ', newValue)
})