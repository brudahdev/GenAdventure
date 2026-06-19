import { RoleConfig } from "@gen-adventure/shared"
import { readJsonConfig } from "../../core/config/readJsonConfig";
import { scenarioConfigPath } from "../../core/config/scenarioConfigPath";

export const ROLE_CONFIG_ADAPTER = 'RoleConfigAdapter'

export interface RoleConfigAdapter {
    getConfig(): RoleConfig[]
}


export class FileRoleConfigAdapter implements RoleConfigAdapter {
    private config: RoleConfig[] | null = null

    constructor(
        private readonly scenariosConfigDirectory: string,
        private readonly scenarioId: string
    ) { }

    getConfig(): RoleConfig[] {
        if (!this.config) {
            const path = scenarioConfigPath(this.scenariosConfigDirectory, this.scenarioId, 'roles.json')
            this.config = readJsonConfig<RoleConfig[]>(path, 'role config')
        }
        return this.config
    }
}
