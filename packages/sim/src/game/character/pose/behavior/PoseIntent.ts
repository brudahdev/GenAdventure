import { ActorIntent, TargetedIntent } from "../../../plan/planDefs";

export const POSE_INTENT = 'poseInt';

/** Role slice: the pose to set. Read by the `SetPose` leaf. */
export interface PosedIntent {
    poseId: string;
}

export interface PoseIntent extends ActorIntent, TargetedIntent, PosedIntent {
    type: typeof POSE_INTENT;
}


export const poseIntent = (
    actorId: string,
    targetId: string,
    poseId: string,
): PoseIntent => ({
    kind: 'intent', type: POSE_INTENT, actorId, targetId, poseId,
});