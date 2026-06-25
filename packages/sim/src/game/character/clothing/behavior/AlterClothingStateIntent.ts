

import { ActorIntent, TargetedIntent } from "../../../plan/planDefs";

export const ALTER_CLOTHING_STATE_INTENT = 'alterClothingState';

/** Role slice: the clothing item + target state. Read by the `AlterClothing` leaf. */
export interface ClothingChangeIntent {
    clothingId: string;
    stateId: string;
}

export interface AlterClothingStateIntent extends ActorIntent, TargetedIntent, ClothingChangeIntent {
    type: typeof ALTER_CLOTHING_STATE_INTENT;
}

export const alterClothingStateIntent = (
    actorId: string,
    targetId: string,
    clothingId: string,
    stateId: string
): AlterClothingStateIntent => ({
    kind: 'intent', type: ALTER_CLOTHING_STATE_INTENT, actorId, targetId, clothingId, stateId,
});

