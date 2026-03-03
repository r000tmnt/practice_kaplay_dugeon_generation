import { createStore, atom } from "jotai";
import type { chunk, prop, roomNode } from "../model/map";
import type { note } from "../model/item";
import { focusAtom } from 'jotai-optics'

export const gameState = atom({
    level: [] as number[][],
    entrance: {} as { x: number, y: number },
    exit: {} as { x: number, y: number },
    props: [] as prop[],
    chunks: {} as Record<string, chunk>,
    enemies: [] as prop[],
    roomNodes: [] as roomNode[],
    polygon: [] as { x: number, y: number }[][],
    inventory: {
        open: false,
        space: [] as (note | null)[],
        gold: 0,
        limit: 12 * 6
    },
    danger: 1,
    cleared: 0
})

export const enemyAtom = focusAtom(gameState, (optic) => optic.prop('enemies'))
export const inventoryUI = focusAtom(gameState, (optic) => optic.prop('inventory'))

export const gameStore = createStore()

export const getGameStoreValue = () => {
    return gameStore.get(gameState)
}

gameStore.sub(gameState, () => {
    // const newValue = getGameStoreValue()
    // console.log('gameStore update ', newValue)
})