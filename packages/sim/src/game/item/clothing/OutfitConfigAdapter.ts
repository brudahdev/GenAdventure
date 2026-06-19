import { OutfitConfig, OutfitSlotConfig } from "@gen-adventure/shared"
import { readJsonConfig } from "../../../core/config/readJsonConfig";
import { indexById, type IndexedById } from "../../../core/config/indexById";

export const OUTFIT_CONFIG_ADAPTER = 'OutfitConfigAdapter'

export interface OutfitConfigAdapter {
    getOutfitConfig(OutfitId: string): OutfitConfig,
    getSlotConfig(): OutfitSlotConfig[],
}

interface OutfitConfigFileSchema {
    outfitSlotConfig: OutfitSlotConfig[],
    outfits: OutfitConfig[]
}


export class FileOutfitConfigAdapter implements OutfitConfigAdapter {
    private readonly outfitSlotConfig: OutfitSlotConfig[]
    private readonly outfits: IndexedById<OutfitConfig>

    constructor(outfitConfigLocation: string) {
        const config = readJsonConfig<OutfitConfigFileSchema>(outfitConfigLocation, 'outfit config')
        this.outfitSlotConfig = config.outfitSlotConfig
        this.outfits = indexById(config.outfits, 'Outfit entry')
    }

    getOutfitConfig(outfitId: string): OutfitConfig {
        return this.outfits.require(outfitId)
    }

    getSlotConfig() {
        return this.outfitSlotConfig;
    }
}
