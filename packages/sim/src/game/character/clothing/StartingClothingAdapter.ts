import { type StartingStateAdapter } from "../StartingStateAdapter";
import { type OutfitConfigAdapter } from "../../item/clothing/OutfitConfigAdapter";

export const STARTING_CLOTHING_ADAPTER = 'StartingClothingAdapter'

/** Resolves a character's starting clothing item ids by its `characterId`. The
 *  parallel of {@link StartingStateAdapter} for clothing: a fresh start derives
 *  them from the role's outfit, a resume restores them from the save. */
export interface StartingClothingAdapter {
    getClothingItemIds(characterId: string): string[]
}

/** Start: resolve the character's `RoleConfig.startingOutfit`, then the outfit's
 *  `clothingItemIds`. */
export class OutfitStartingClothingAdapter implements StartingClothingAdapter {
    constructor(
        private readonly startingState: StartingStateAdapter,
        private readonly outfitConfig: OutfitConfigAdapter,
    ) { }

    getClothingItemIds(characterId: string): string[] {
        const outfitId = this.startingState.getRoleConfig(characterId).startingOutfit
        return this.outfitConfig.getOutfitConfig(outfitId).clothingItemIds
    }
}
