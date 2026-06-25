
import { ActorIntent } from "../../../plan/planDefs";

export const GO_TO_INTENT = 'goToInt';

/** Role slice: a fixed destination. Read by the `HopTowardLocation` leaf. */
export interface LocatedIntent {
    locationId: string;
    subLocationId?: string;
}

export interface GoToIntent extends ActorIntent, LocatedIntent {
    type: typeof GO_TO_INTENT;
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

