import { CharacterConfig } from "@gen-adventure/shared"
import { join } from "path";
import { readJsonConfig } from "../../core/config/readJsonConfig";

export const CHARACTER_CONFIG_ADAPTER = 'CharacterConfigAdapter'

export interface CharacterConfigAdapter {
    getConfig(characterId: string): CharacterConfig
}


export class FileCharacterConfigAdapter implements CharacterConfigAdapter {
    private readonly configs = new Map<string, CharacterConfig>()

    constructor(
        private readonly charactersConfigDirectory: string
    ) { }

    getConfig(characterId: string): CharacterConfig {
        let config = this.configs.get(characterId)
        if (!config) {
            const path = join(this.charactersConfigDirectory, `${characterId}.json`)
            config = readJsonConfig<CharacterConfig>(path, `character config for ${characterId}`)
            this.configs.set(characterId, config)
        }
        return config
    }
}
