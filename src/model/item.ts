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
export type {
    base
}

export {
    RARITY_COLORS
}