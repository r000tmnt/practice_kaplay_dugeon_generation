import { atom, createStore } from "jotai";
import { focusAtom } from "jotai-optics";

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
            perRoomChance: 0.9,
            maxPerRoom: 1,
        },
        shrine: {
            perFloorChance: 0.3,
            maxPerRoom: 1,
        },
        decoration: {
            perRoomChance: 0.75,
            density: 0.03,
        }
    },
    keys: {
        'up': 'w',
        'down': 's',
        'left': 'a',
        'right': 'd',
        'inventory': 'i',
        'main_attack': 'mouse_left', 
        'option': 'esc',
        'skill': 's',
        'map': 'tab',
        'quick_slot_1': '1',
        'quick_slot_2': '2',
        'quick_slot_3': '3',
        'quick_slot_4': '4',
        'quick_slot_5': '5',
        'quick_slot_6': '6',
        'quick_slot_7': '7',
        'quick_slot_8': '8',
        'quick_slot_9': '9',
        'quick_slot_10': '0',
    }
})

export const optionStore = createStore()

export const getOptionValue = () => {
    return optionStore.get(setting)
}

export const keybinding = focusAtom(setting, (optic) => optic.prop('keys'))

optionStore.sub(setting, () => {
    const newValue = getOptionValue()
    console.log('optionStore update ', newValue)
})
