

import { ActorIntent } from "../../../plan/planDefs";

export const ALTER_CLOTHING_STATE_INTENT = 'alterClothingState';

export interface AlterClothingStateIntent extends ActorIntent {
    type: typeof ALTER_CLOTHING_STATE_INTENT;
    targetId: string;
    clothingId: string;
    stateId: string;
}

export const alterClothingStateIntent = (
    actorId: string,
    targetId: string,
    clothingId: string,
    stateId: string
): AlterClothingStateIntent => ({
    kind: 'intent', type: ALTER_CLOTHING_STATE_INTENT, actorId, targetId, clothingId, stateId,
});

