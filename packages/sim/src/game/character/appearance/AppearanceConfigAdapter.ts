import { AppearanceClassConfig, AppearanceConfig, AppearanceEntryConfig } from "@gen-adventure/shared"
import { readJsonConfig } from "../../../core/config/readJsonConfig";
import { indexById, type IndexedById } from "../../../core/config/indexById";

export const APPEARANCE_CONFIG_ADAPTER = 'AppearanceConfigAdapter'

export interface AppearanceConfigAdapter {
    getAppearanceEntryConfig(entryId: string): AppearanceEntryConfig,
    getAppearanceClassConfig(): AppearanceClassConfig[]
}


export class FileAppearanceConfigAdapter implements AppearanceConfigAdapter {
    private readonly appearanceClasses: AppearanceClassConfig[]
    private readonly entries: IndexedById<AppearanceEntryConfig>

    constructor(appearanceConfigLocation: string) {
        const config = readJsonConfig<AppearanceConfig>(appearanceConfigLocation, 'appearance config')
        this.appearanceClasses = config.appearanceClasses
        this.entries = indexById(config.appearance, 'appearance entry')
    }

    getAppearanceEntryConfig(entryId: string): AppearanceEntryConfig {
        return this.entries.require(entryId)
    }

    getAppearanceClassConfig() {
        return this.appearanceClasses
    }
}
