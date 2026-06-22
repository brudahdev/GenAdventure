import { ActorIntent } from "../../../plan/planDefs";

export const POSE_INTENT = 'poseInt';


export interface PoseIntent extends ActorIntent {
    type: typeof POSE_INTENT;
    targetId: string;
    poseId: string;
}


export const poseIntent = (
    actorId: string,
    targetId: string,
    poseId: string,
): PoseIntent => ({
    kind: 'intent', type: POSE_INTENT, actorId, targetId, poseId,
});