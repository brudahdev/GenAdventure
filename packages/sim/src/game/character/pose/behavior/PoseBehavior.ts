import type { BehaviorDefinition } from "../../../behavior/BehaviorDefinition"
import { POSE_INTENT } from "./PoseIntent"

/** Set the target's pose — a single instant leaf. */
const POSE_TREE = `
root {
    action [SetPose]
}`

/** Behaviour for the {@link import("./PoseIntent").PoseIntent}: see the `SetPose`
 *  leaf in {@link import("./poseLeaves").POSE_LEAVES}. */
export const POSE_BEHAVIOR: BehaviorDefinition = {
    type: POSE_INTENT,
    tree: POSE_TREE,
}
