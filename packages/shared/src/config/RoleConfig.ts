export interface RoleConfig {
    roleOrder: number,
    startingLocationId: string,
    startingSubLocationId: string,
    startingPoseId: string,
    startingOutfit: string,
    personaId?: string,
}

/** The player's stable `characterId`. The player is not a Voxta role and has no
 *  real character id, so we mint a constant one used as its identity across the
 *  sim, main, and UI. */
export const PLAYER_CHARACTER_ID = '304f3459-53fc-400d-9a70-ba38152456f7'

/** The player's `roleOrder` in `roles.json`. Voxta roles use their 0-based
 *  `roleOrder`, so -1 can never collide. Used only for saving role config. */
export const PLAYER_ROLE_ORDER = -1
