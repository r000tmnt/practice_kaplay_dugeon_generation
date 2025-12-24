import { atom } from "jotai";
import type { chunk, prop, room } from "../model/map";

export const gameState = atom({
    level: [] as number[][][],
    rooms: [] as room[][],
    entrances: [] as { x: number, y: number }[],
    exits: [] as { x: number, y: number }[],
    props: [] as prop[],
    chunks: {} as Map<string, chunk>
})