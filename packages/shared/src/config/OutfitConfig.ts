export interface OutfitSlotConfig {
    id: string;
    subItems?: OutfitSlotConfig[];
}

export interface OutfitConfig {
    id: string;
    clothingItemIds: string[];
}