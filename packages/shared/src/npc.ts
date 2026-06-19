/** Emitted when an NPC's activation state changes (co-located with the player
 *  ⇒ active in the Voxta chat). Shared between the sim worker and the main
 *  process. */
export interface NpcActivationChange {
    characterId: string
    isActive: boolean
    useFade: boolean
}
