import type { Command, Intent } from "../../core/plan/planTypes"
import { pending } from "../../core/plan/planTypes"

/** Concrete intent/command shapes for the game, plus their `type` discriminators
 *  and tiny factory functions. Everything is plain data; the behavior lives in
 *  the registered decomposers/command-systems in this folder. */

/** An intent owned by a specific actor — the actor whose {@link
 *  import("../../core/plan/ActorPlan").ActorPlan} the plan executor appends to. */
export interface ActorIntent extends Intent {
    actorId: string
}

export const GOTO_CHARACTER_INTENT = 'goToCharacter'
export interface GoToCharacterIntent extends ActorIntent {
    type: typeof GOTO_CHARACTER_INTENT
    characterId: string
}
export const goToCharacterIntent = (actorId: string, characterId: string): GoToCharacterIntent => ({
    kind: 'intent', type: GOTO_CHARACTER_INTENT, actorId, characterId,
})

export const GOTO_NEARBY_LOCATION_COMMAND = 'goToNearbyLocation'
export interface GoToNearbyLocationCommand extends Command {
    type: typeof GOTO_NEARBY_LOCATION_COMMAND
    actorId: string
    /** A sub-location id (move within the current location) or a connected
     *  location id (a LocationLink hop), resolved at run time by
     *  {@link import("../character/locomotion/CharacterLocomotion").CharacterLocomotion.findNearbyLocationById}. */
    locationId: string
}
export const goToNearbyLocationCommand = (actorId: string, locationId: string): GoToNearbyLocationCommand => ({
    kind: 'command', type: GOTO_NEARBY_LOCATION_COMMAND, status: pending(), actorId, locationId,
})


