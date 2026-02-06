import type { KEventController } from "kaplay";

type ItemTypes =
  | 'head'
  | 'body'
  | 'hand'
  | 'feet'
  | 'accessory'
  | 'potion'
  | 'card'
  | 'other'
  | 'gold'

type EquipField =
  | "head"
  | "body"
  | "feet"
  | "accessory1"
  | "rightHand"
  | "leftHand"
  | "accessory2"
  | "ring";

type RarityTypes = 'common' | 'advance' | 'rare' | 'unique' | 'legendary';

type partialItem = Partial<Record<ItemTypes, number>>

const RARITY_COLORS: Record<RarityTypes, string> = {
    'common': '#ffffff', // White,
    'advance': '#1eff00', // Green
    'rare': '#0070dd', // Blue
    'unique': '#a335ee', // Purple\
    'legendary': '#ff8000', // Orange
}

interface base {
    count: {
        min: number,
        max: number
    };
    item: partialItem;
    gold: {
        min: number,
        max: number
    };
}

interface item {
    id: string,
    name: string,
    desc: string,
    stackable: boolean,
    oneHanded?: boolean,
    attribute?: object | null,
    secondary?: object | null,
    element?: object | null,
    resist?: object | null,
    max?: object | null,
    required?: object | null
    effect?: object | null
    quantity?: number
    price?: number
}

interface pickableItem {
    id: string,
    required: string[],
    pick: () => void,
    onDrag: (action: () => void) => KEventController,
    onDragUpdate: (action: () => void) => KEventController,
    onDragEnd: (action: () => void) => KEventController,
    update: () => void,
}

interface note {
    index: number
    item: item,
    frame: number
}

export type {
    base,
    note,
    item,
    pickableItem,
    EquipField
}

export {
    RARITY_COLORS
}