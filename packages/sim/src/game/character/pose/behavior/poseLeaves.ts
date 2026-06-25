import { State } from "mistreevous"
import type { BehaviorContext, LeafSet } from "../../../behavior/BehaviorContext"
import { CharacterPoseKey } from "../CharacterPose"
import { isStanding, standPoseId } from "../../../plan/poseGuards"
import type { PoseIntent } from "./PoseIntent"

/** Pose leaves: `SetPose` (pose intent) plus `Stand`/`IsStanding`, which back the
 *  shared `StandUp` subtree (it lives with pose). */
export const POSE_LEAVES: LeafSet = {
    leaves: {
        IsStanding(ctx: BehaviorContext): boolean {
            const actor = ctx.deps.registry.getById(ctx.intent.actorId)
            return actor ? isStanding(actor) : false
        },

        Stand(ctx: BehaviorContext): State {
            const actor = ctx.deps.registry.getById(ctx.intent.actorId)
            if (!actor) return State.FAILED
            if (isStanding(actor)) return State.SUCCEEDED

            const standId = standPoseId(actor)
            if (!standId) return State.FAILED

            const pose = actor.require(CharacterPoseKey)
            pose.setPoseById(standId)
            ctx.notifier.notifyPose(actor.id, actor.id, pose.getCurrentPose())
            return State.SUCCEEDED
        },

        SetPose(ctx: BehaviorContext): State {
            const { actorId, targetId, poseId } = ctx.intent as PoseIntent
            const target = ctx.deps.registry.getById(targetId)
            if (!target) return State.FAILED

            const charPose = target.require(CharacterPoseKey)
            if (!charPose.getPoseById(poseId)) return State.FAILED
            if (!charPose.getAvailablePoseOptions().has(poseId)) return State.FAILED

            charPose.setPoseById(poseId)
            ctx.notifier.notifyPose(actorId, target.id, charPose.getCurrentPose())
            return State.SUCCEEDED
        },
    },
}
