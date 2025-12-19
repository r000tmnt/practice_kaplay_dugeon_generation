import { atom } from "jotai";

export const setting = atom({
    width: 1280,
    height: 720,
    scale: 0,
    uiOffsetV: 0,
    uiOffsetH: 0,
    saveSlot: 5,
    tileWidth: 48,
})