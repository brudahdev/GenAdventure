import { PlayerConfig } from "@gen-adventure/shared"
import { readJsonConfig } from "../../core/config/readJsonConfig"

export const PLAYER_PERSONA_CONFIG_ADAPTER = 'PlayerPersonaConfigAdapter'

export interface PlayerPersonaConfigAdapter {
    getConfig(personaId: string): PlayerConfig
}

export class FilePlayerPersonaConfigAdapter implements PlayerPersonaConfigAdapter {
    private personas: Map<string, PlayerConfig> | null = null

    constructor(private readonly playerPersonaConfigLocation: string) { }

    getConfig(personaId: string): PlayerConfig {
        if (!this.personas) {
            const list = readJsonConfig<PlayerConfig[]>(
                this.playerPersonaConfigLocation, 'player personas')
            this.personas = new Map(list.map((p) => [p.personaId, p]))
        }
        const config = this.personas.get(personaId)
        if (!config) {
            throw new Error(`unable to find player persona with id ${personaId}`)
        }
        return config
    }
}
