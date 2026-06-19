import { PLAYER_CHARACTER_ID, PLAYER_ROLE_ORDER, RoleConfig, SimStartCharacterData } from "@gen-adventure/shared"
import { type RoleConfigAdapter } from "./RoleConfigAdapter";

export const STARTING_STATE_ADAPTER = 'StartingStateAdapter'

/** Resolves a character's starting `RoleConfig` (location, sub-location, pose, …)
 *  by mapping its `characterId` to a `roleOrder` and looking that role up in the
 *  scenario's `roles.json`. The player maps to `roleOrder` -1. */
export interface StartingStateAdapter {
    getRoleConfig(characterId: string): RoleConfig
}

export class RoleStartingStateAdapter implements StartingStateAdapter {
    constructor(
        private readonly roleConfigAdapter: RoleConfigAdapter,
        private readonly startingCharacterData: SimStartCharacterData[]
    ) { }

    getRoleConfig(characterId: string): RoleConfig {
        const roleOrder = this.resolveRoleOrder(characterId)

        const roleConfig = this.roleConfigAdapter.getConfig()
            .find(config => config.roleOrder === roleOrder)
        if (!roleConfig) {
            throw new Error("unable to find config for role order " + roleOrder)
        }

        return roleConfig
    }

    private resolveRoleOrder(characterId: string): number {
        if (characterId === PLAYER_CHARACTER_ID) {
            return PLAYER_ROLE_ORDER
        }

        const roleOrder = this.startingCharacterData
            .find(startChar => startChar.characterId === characterId)
            ?.roleOrder
        if (roleOrder === undefined) {
            throw new Error("unable to find role order for characterId " + characterId)
        }
        return roleOrder
    }
}
