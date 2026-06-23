import { ActorIntent } from "../../../../plan/planDefs";

export const TOUCH_INTENT = 'touch';

export interface TouchIntent extends ActorIntent {
    type: typeof TOUCH_INTENT;
    targetId: string;
    actorPartTag: string;
    targetPartTag: string;
    verb: string;
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
