import { ActorIntent, TargetedIntent } from "../../../../plan/planDefs";

export const TOUCH_INTENT = 'touch';

/** Role slice: the body-part touch parameters. Read by the `Touch` leaf. */
export interface TouchActionIntent {
    actorPartTag: string;
    targetPartTag: string;
    verb: string;
}

export interface TouchIntent extends ActorIntent, TargetedIntent, TouchActionIntent {
    type: typeof TOUCH_INTENT;
}

export const touchIntent = (
    actorId: string,
    targetId: string,
    actorPartTag: string,
    targetPartTag: string,
    verb: string
): TouchIntent => ({
    kind: 'intent', type: TOUCH_INTENT, actorId, targetId, actorPartTag, targetPartTag, verb,
});
