
import { ActorIntent } from "../../../plan/planDefs";

export const GO_TO_INTENT = 'goToInt';

export interface GoToIntent extends ActorIntent {
    type: typeof GO_TO_INTENT;
    targetId: string;
}

export const alterClothingStateIntent = (
    actorId: string,
    targetId: string,
): GoToIntent => ({
    kind: 'intent', type: GO_TO_INTENT, actorId, targetId,
});

