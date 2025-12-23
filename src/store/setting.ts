import { atom } from "jotai";

export const setting = atom({
    width: 1280,
    height: 720,
    scale: 0,
    uiOffsetV: 0,
    uiOffsetH: 0,
    saveSlot: 5,
    tileWidth: 48,
    chunkSize: 16,
    propRules: {
        pot: {
            density: 0.03,
            min: 0,
            max: 6,
        },
        chest: {
            perRoomChance: 0.25,
            maxPerRoom: 1,
        },
        shrine: {
            perFloorChance: 0.1,
        }
    }
})