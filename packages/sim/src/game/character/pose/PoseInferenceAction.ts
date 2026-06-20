import { ActionContent, arg, CharacterInferenceAction, InferredArgs, optional } from "../../../core/action-inference/CharacterInferenceAction"
import { InferenceActionManager } from "../../../core/action-inference/InferenceActionManager"
import { Entity } from "../../../core/ec/Entity"
import { EntityRegistry } from "../../entity/EntityRegistry"
import { EventSystem } from "../../EventSystem"
import { buildAvatarPrompt } from "../characterViews"
import { CharacterIdentity, CharacterIdentityKey } from "../identity/CharacterIdentity"
import { resolveTargetCharacter } from "../identity/characterLookup"
import { CharacterPoseKey } from "./CharacterPose"




const PoseInferenceArgs = {
    subjectName: arg.string(),
    newPoseName: arg.string(),
}

type PoseInferenceArgs = typeof PoseInferenceArgs

export class PoseInferenceAction extends CharacterInferenceAction<PoseInferenceArgs> {

    readonly args = PoseInferenceArgs

    private readonly charId: CharacterIdentity
    constructor(
        private entity: Entity,
        private eventSystem: EventSystem,
        manager: InferenceActionManager,
        private readonly registry: EntityRegistry,
    ) {
        const charId = entity.require(CharacterIdentityKey);

        super({
            name: `${charId.name}_change_pose`, characterId: entity.id,
            layer: 'act',
            before: false
        }, manager)
        this.charId = charId;
        this.init();
    }

    protected computeContent(): ActionContent<PoseInferenceArgs> {
        return {
            description: `When ${this.charId.name} changes ${this.charId.config.pronouns.himHer} or another's pose. Do NOT call this if its only a request, command, or hypothetical`,
            argDescriptions: {
                subjectName: 'The name of the person whose pose changed.',
                newPoseName: 'The name of the pose to change to type:[stand|sit|squat|kneel|lay_on_stomach|lay_on_side|lay_on_back|bent_over] (non exaustive, you may pick others)',
            },
        }

    }

    handle(args: InferredArgs<PoseInferenceArgs>): void {
        console.log("ACTION CALLED: " + JSON.stringify(args))
        const targetData = resolveTargetCharacter(this.registry, args.subjectName, this.entity)
        if (!targetData) {
            console.log("unable to find target character with name " + args.subjectName)
            return;
        }
        const targetEntity = targetData.target

        const targetposeManager = targetEntity.require(CharacterPoseKey)
        const targetPose = targetposeManager.getPoseByTag(args.newPoseName)
        if (!targetPose) {
            console.log("unable to find pose by tag " + args.newPoseName)
            return;
        }

        const targetPoseId = targetPose.id
        targetposeManager.setPoseById(targetPoseId)


        this.eventSystem.emit("image.request", buildAvatarPrompt(targetEntity))
    }
}