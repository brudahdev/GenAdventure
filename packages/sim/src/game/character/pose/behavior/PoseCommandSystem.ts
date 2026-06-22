import { Lifecycle, scoped } from "tsyringe"
import type { CommandSystem } from "../../../../core/plan/CommandSystem"
import { completed, invalid, ok, type CommandStatus, type Validation } from "../../../../core/plan/planTypes"
import { EntityRegistry } from "../../../entity/EntityRegistry"
import { CharacterPoseKey } from "../CharacterPose"
import { type PoseCommand } from "./PoseCommand"
import { POSE_COMMAND } from "./PoseCommand"
import { Notif, NotificationService } from "../../../../core/NotificationService"
import { Pose } from "../Pose"
import { CharacterIdentityKey } from "../../identity/CharacterIdentity"
import { CharacterLocationKey } from "../../location/CharacterLocation"
import { StringUtils } from "../../../../utils/StringUtils"

/** Sets an actor's pose. Instant. */
@scoped(Lifecycle.ContainerScoped)
export class PoseCommandSystem implements CommandSystem<PoseCommand> {
    readonly type = POSE_COMMAND

    constructor(
        private readonly registry: EntityRegistry,
        private readonly notificationService: NotificationService
    ) { }

    validate(cmd: PoseCommand): Validation {///todo target pose available, not on actor/ validate actor in same subloc as target
        const actor = this.registry.getById(cmd.actorId)
        if (!actor) return invalid(`actor ${cmd.actorId} not found`)
        if (!actor.require(CharacterPoseKey).getPoseById(cmd.poseId)) {
            return invalid(`pose '${cmd.poseId}' unknown for ${cmd.actorId}`)
        }
        return ok()
    }

    execute(cmd: PoseCommand): CommandStatus {
        const target = this.registry.requireById(cmd.targetId)
        const targetCharPose = target.require(CharacterPoseKey)

        targetCharPose.setPoseById(cmd.poseId);

        this.sendNotificaiton(cmd, targetCharPose.getCurrentPose());

        return completed()
    }

    private sendNotificaiton(cmd: PoseCommand, pose: Pose) {
        const actor = this.registry.requireById(cmd.actorId)
        const actorIden = actor.require(CharacterIdentityKey);

        let txt: string
        let actorTxt: string

        if (cmd.actorId == cmd.targetId) {
            const charPose = actor.require(CharacterPoseKey);

            txt = `${actorIden.name} ${pose.verb}. ${StringUtils.capitalizeFirstLetter(actorIden.config.pronouns.heShe)} is now ${charPose.getLocationPoseContextPrompt()}.`
            actorTxt = `*${pose.verb}*`
        } else {
            const target = this.registry.requireById(cmd.targetId)
            const targetIden = target.require(CharacterIdentityKey);
            const charPose = target.require(CharacterPoseKey);

            const actorIden = actor.require(CharacterIdentityKey);


            txt = `${actorIden.name} ${pose.verb} ${targetIden.name}. ${targetIden.name} is now ${charPose.getLocationPoseContextPrompt()}.`
            actorTxt = `*${pose.verb} ${targetIden.name}*`
        }

        const witnesses = actor.require(CharacterLocationKey).getCurrentLocation().getCharactersInLocation().map(ent => ent.id)

        const notif: Notif = {
            text: txt,
            characterIds: witnesses,
            actorInfo: {
                text: actorTxt,
                actorId: actor.id
            }
        }

        this.notificationService.send(notif)

    }
}
