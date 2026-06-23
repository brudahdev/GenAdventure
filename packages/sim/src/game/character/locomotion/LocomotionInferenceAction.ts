import { ActionContent, arg, CharacterInferenceAction, InferredArgs, optional } from "../../../core/action-inference/CharacterInferenceAction"
import { InferenceActionManager } from "../../../core/action-inference/InferenceActionManager"
import { Entity } from "../../../core/ec/Entity"
import { EntityRegistry } from "../../entity/EntityRegistry"
import { EventSystem } from "../../EventSystem"
import { LocationLink } from "../../location/LocationLink"
import { BehaviorDispatcher } from "../../behavior/BehaviorDispatcher"
import { buildAvatarPrompt } from "../characterViews"
import { CharacterIdentity, CharacterIdentityKey } from "../identity/CharacterIdentity"
import { resolveTargetCharacter } from "../identity/characterLookup"
import { NpcActivityKey } from "../npc/NpcActivity"
import { goToIntent } from "./behavior/GoToIntent"
import { CharacterLocomotionKey } from "./CharacterLocomotion"




const LocomotionInferenceArgs = {
    newLocationName: arg.string()
}

type LocomotionInferenceArgs = typeof LocomotionInferenceArgs

export class LocomotionInferenceAction extends CharacterInferenceAction<LocomotionInferenceArgs> {

    readonly args = LocomotionInferenceArgs

    private readonly charId: CharacterIdentity
    constructor(
        private entity: Entity,
        private eventSystem: EventSystem,
        manager: InferenceActionManager,
        private readonly registry: EntityRegistry,
        private readonly dispatcher: BehaviorDispatcher,
    ) {
        const charId = entity.require(CharacterIdentityKey);

        super({
            name: `${charId.name}_change_Locomotion`, characterId: entity.id,
            layer: 'act',
            before: false
        }, manager)
        this.charId = charId;
        this.init();
    }

    protected computeContent(): ActionContent<LocomotionInferenceArgs> {
        return {
            description: `When ${this.charId.name} movese to a different location. Do NOT call this if its only a request, command, or hypothetical`,
            argDescriptions: {
                newLocationName: 'Name of the target destination.', //todo Choose one of these: [${this.targetLocationOptions}]
            },
        }

    }

    handle(args: InferredArgs<LocomotionInferenceArgs>): void {//todo move other character
        // const targetData = resolveTargetCharacter(this.registry, args.subjectName, this.entity)
        // if (!targetData) {
        //     console.log("unable to find target character with name " + args.subjectName)
        //     return;
        // }

        ///<invoke>Neena_change_Locomotion("<user name>")
        // <invoke>Cortney_change_Locomotion("standing near <user name>")

        const targetEntity = this.entity

        const targetLocomotionManager = targetEntity.require(CharacterLocomotionKey)
        const targetLocation = targetLocomotionManager.findNearbyLocationByTag(args.newLocationName)
        if (!targetLocation) {
            console.log("unable to find Locomotion by tag " + args.newLocationName)
            return;
        }


        let targetLocationId: string;
        let targetSubLocationId: string | undefined;
        if (targetLocation instanceof LocationLink) {
            targetLocationId = targetLocation.getTo().id;
        } else {//instance of sublocation
            targetLocationId = targetLocation.getParent().id
            targetSubLocationId = targetLocation.id
        }


        this.dispatcher.submit(
            goToIntent(this.entity.id, targetLocationId, targetSubLocationId),
            (success) => {
                if (success && targetEntity.require(NpcActivityKey).isActive) {
                    this.eventSystem.emit("image.request", buildAvatarPrompt(targetEntity))
                }
            },
        )
    }
}