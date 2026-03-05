import type { KEventController } from "kaplay";
import type { Attribute, Secondary, Element, MaxStats, Require, Effect } from './stat'

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

const itemSubType = [
    // head
    'Helm', 'Hat', 'Hood', // 2
    // body,
    'Cloth', 'Armor', 'Coat', // 5
    // right hand,
    'Sword', 'Bat', 'Hammer', 'Axe', 'Gun', // 10
    // left hand,
    'Shield', // 11
    // feet,
    'Booth', 'Sandal',  // 13
    // accessory,
    'Jewel', 'Charm', 'Ring', 'Badge', // 17
    // potion
    'Potion', // 18
    // cards
    'Card', // 19
    // other
    // 20
]

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
    rarity?: string,
    name: string,
    desc: string,
    type?: number,
    stackable: boolean,
    oneHanded?: boolean,
    attribute?: Attribute | null,
    secondary?: Secondary | null,
    element?: Element | null,
    resist?: Element | null,
    max?: MaxStats | null,
    required?: Require | null
    effect?: Effect | null
    quantity?: number
    price?: number
    limit?: number
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
    EquipField,
    RarityTypes
}

export {
    RARITY_COLORS,
    itemSubType,
}