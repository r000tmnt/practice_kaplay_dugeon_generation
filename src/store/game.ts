import { atom } from "jotai";
import type { room } from "../model/map";

export const gameState = atom({
    level: [] as number[][][],
    rooms: [] as room[][],
    entrances: [] as { x: number, y: number }[],
    exits: [] as { x: number, y: number }[],
})