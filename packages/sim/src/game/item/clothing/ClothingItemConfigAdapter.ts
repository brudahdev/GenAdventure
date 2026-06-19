import { ClothingItemConfig } from "@gen-adventure/shared"
import { readJsonConfig } from "../../../core/config/readJsonConfig";
import { indexById, type IndexedById } from "../../../core/config/indexById";

export const CLOTHING_ITEM_CONFIG_ADAPTER = 'ClothingItemConfigAdapter'

export interface ClothingItemConfigAdapter {
    getClothingItemConfig(clothingItemId: string): ClothingItemConfig,
}


export class FileClothingItemConfigAdapter implements ClothingItemConfigAdapter {
    private readonly items: IndexedById<ClothingItemConfig>

    constructor(clothingItemConfigLocation: string) {
        this.items = indexById(
            readJsonConfig<ClothingItemConfig[]>(clothingItemConfigLocation, 'clothing item config'),
            'ClothingItem entry',
        )
    }

    getClothingItemConfig(entryId: string): ClothingItemConfig {
        return this.items.require(entryId)
    }
}
