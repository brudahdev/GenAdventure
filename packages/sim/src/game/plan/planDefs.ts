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

// --- Intents ---

export const ALTER_CLOTHING_STATE_INTENT = 'alterClothingState'
export interface AlterClothingStateIntent extends ActorIntent {
    type: typeof ALTER_CLOTHING_STATE_INTENT
    targetId: string
    clothingId: string
    stateId: string
}
export const alterClothingStateIntent = (
    actorId: string, targetId: string, clothingId: string, stateId: string,
): AlterClothingStateIntent => ({
    kind: 'intent', type: ALTER_CLOTHING_STATE_INTENT, actorId, targetId, clothingId, stateId,
})

export const GOTO_CHARACTER_INTENT = 'goToCharacter'
export interface GoToCharacterIntent extends ActorIntent {
    type: typeof GOTO_CHARACTER_INTENT
    characterId: string
}
export const goToCharacterIntent = (actorId: string, characterId: string): GoToCharacterIntent => ({
    kind: 'intent', type: GOTO_CHARACTER_INTENT, actorId, characterId,
})

// --- Commands ---

export const POSE_COMMAND = 'pose'
export interface PoseCommand extends Command {
    type: typeof POSE_COMMAND
    actorId: string
    poseId: string
}
export const poseCommand = (actorId: string, poseId: string): PoseCommand => ({
    kind: 'command', type: POSE_COMMAND, status: pending(), actorId, poseId,
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

export const ALTER_CLOTHING_STATE_COMMAND = 'alterClothingStateCmd'
export interface AlterClothingStateCommand extends Command {
    type: typeof ALTER_CLOTHING_STATE_COMMAND
    actorId: string
    targetId: string
    clothingId: string
    stateId: string
}
export const alterClothingStateCommand = (
    actorId: string, targetId: string, clothingId: string, stateId: string,
): AlterClothingStateCommand => ({
    kind: 'command', type: ALTER_CLOTHING_STATE_COMMAND, status: pending(), actorId, targetId, clothingId, stateId,
})
