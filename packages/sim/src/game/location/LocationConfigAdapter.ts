import { LocationConfig } from "@gen-adventure/shared"
import { readJsonConfig } from "../../core/config/readJsonConfig";
import { scenarioConfigPath } from "../../core/config/scenarioConfigPath";

export const LOCATION_CONFIG_ADAPTER = 'LocationConfigAdapter'

export interface LocationConfigAdapter {
    getConfig(): LocationConfig[]
}


export class FileLocationConfigAdapter implements LocationConfigAdapter {
    private config: LocationConfig[] | null = null

    constructor(
        private readonly scenariosConfigDirectory: string,
        private readonly scenarioId: string
    ) { }

    getConfig(): LocationConfig[] {
        if (!this.config) {
            const path = scenarioConfigPath(this.scenariosConfigDirectory, this.scenarioId, 'locations.json')
            this.config = readJsonConfig<LocationConfig[]>(path, 'location config')
        }
        return this.config
    }
}
