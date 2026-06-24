import type { TouchInteractionArgs } from "./TouchManager";

export const STARTING_TOUCH_ADAPTER = 'StartingTouchAdapter'

/** Resolves a character's touch interactions active at the start of a fresh run —
 *  the parallel of {@link import("../../clothing/StartingClothingAdapter").StartingClothingAdapter}
 *  for touch. A resume restores them from the save via {@link RestoreSource}; a
 *  fresh start derives them here. */
export interface StartingTouchAdapter {
    getStartingInteractions(characterId: string): TouchInteractionArgs[]
}

/** Stub start source: no active touches at the start of a fresh run. Replace with
 *  a scenario-defined source later. */
export class EmptyStartingTouchAdapter implements StartingTouchAdapter {
    getStartingInteractions(): TouchInteractionArgs[] {
        return []
    }
}
