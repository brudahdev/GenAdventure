import type { Entity } from "../../core/ec/Entity"
import { CharacterPoseKey } from "../character/pose/CharacterPose"

/** The pose tag denoting an upright pose (see `poses.json`: the `stand` pose is
 *  tagged `stand`). Shared by the decomposer guard ("insert Stand before moving")
 *  and the move command's precondition ("must be standing to move"). */
export const STAND_POSE_TAG = 'stand'

/** True when the entity's current pose is an upright/standing one. */
export function isStanding(entity: Entity): boolean {
    const pose = entity.require(CharacterPoseKey)
    const current = pose.getPoseById(pose.getCurrentPoseId())
    return current?.tags.includes(STAND_POSE_TAG) ?? false
}

/** The id of a standing pose for this entity, or `undefined` if none is
 *  configured. */
export function standPoseId(entity: Entity): string | undefined {
    return entity.require(CharacterPoseKey).getPoseByTag(STAND_POSE_TAG)?.id
}
