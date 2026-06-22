
import { ActorIntent } from "../../../plan/planDefs";

export const GO_TO_INTENT = 'goToInt';

export interface GoToIntent extends ActorIntent {
    type: typeof GO_TO_INTENT;
    locationId: string;
    subLocationId?: string;
}

export const goToIntent = (
    actorId: string,
    locationId: string,
    subLocationId?: string
): GoToIntent => ({
    kind: 'intent',
    type: GO_TO_INTENT,
    actorId,
    locationId,
    subLocationId

});

