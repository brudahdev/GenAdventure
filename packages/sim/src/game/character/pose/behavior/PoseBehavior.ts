import type { ActorIntent } from "../../../plan/planDefs"
import type { BehaviorDefinition } from "../../../behavior/BehaviorDefinition"
import { POSE_INTENT, type PoseIntent } from "./PoseIntent"

/** Set the target's pose — a single instant leaf. */
const POSE_TREE = `
root {
    action [SetPose]
}`

/** Behaviour for the {@link PoseIntent}: see {@link import("../../../behavior/CharacterBehaviorAgent").CharacterBehaviorAgent}'s `SetPose`. */
export const POSE_BEHAVIOR: BehaviorDefinition = {
    type: POSE_INTENT,
    tree: POSE_TREE,
    toParams: (intent: ActorIntent) => {
        const i = intent as PoseIntent
        return { actorId: i.actorId, targetId: i.targetId, poseId: i.poseId }
    },
}
