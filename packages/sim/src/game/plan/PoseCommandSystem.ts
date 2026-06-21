import { Lifecycle, scoped } from "tsyringe"
import type { CommandSystem } from "../../core/plan/CommandSystem"
import { completed, invalid, ok, type CommandStatus, type Validation } from "../../core/plan/planTypes"
import { EntityRegistry } from "../entity/EntityRegistry"
import { CharacterPoseKey } from "../character/pose/CharacterPose"
import { POSE_COMMAND, type PoseCommand } from "./planDefs"

/** Sets an actor's pose. Instant. */
@scoped(Lifecycle.ContainerScoped)
export class PoseCommandSystem implements CommandSystem<PoseCommand> {
    readonly type = POSE_COMMAND

    constructor(private readonly registry: EntityRegistry) { }

    validate(cmd: PoseCommand): Validation {
        const actor = this.registry.getById(cmd.actorId)
        if (!actor) return invalid(`actor ${cmd.actorId} not found`)
        if (!actor.require(CharacterPoseKey).getPoseById(cmd.poseId)) {
            return invalid(`pose '${cmd.poseId}' unknown for ${cmd.actorId}`)
        }
        return ok()
    }

    execute(cmd: PoseCommand): CommandStatus {
        this.registry.requireById(cmd.actorId).require(CharacterPoseKey).setPoseById(cmd.poseId)
        return completed()
    }
}
