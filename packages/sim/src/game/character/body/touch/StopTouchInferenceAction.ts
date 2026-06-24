import { ActionContent, arg, CharacterInferenceAction, InferredArgs } from "../../../../core/action-inference/CharacterInferenceAction";
import { InferenceActionManager } from "../../../../core/action-inference/InferenceActionManager";
import { Entity } from "../../../../core/ec/Entity";
import { BehaviorDispatcher } from "../../../behavior/BehaviorDispatcher";
import { EntityRegistry } from "../../../entity/EntityRegistry";
import { EventSystem } from "../../../EventSystem";
import { CharacterIdentityKey } from "../../identity/CharacterIdentity";
import { resolveTargetCharacter } from "../../identity/characterLookup";
import { touchIntent } from "./behavior/TouchIntent";
import { AvatarKey } from "../../Avatar";
import { TouchInteraction } from "./Touch";
import { DuoTouchInteraction } from "./TouchDuo";


const touchInferenceArgs = {}

export interface StopTouchDetails {
    name: string;
    description: string;
}

type StopTouchInferenceArgs = typeof touchInferenceArgs

export class StopTouchInferenceAction extends CharacterInferenceAction<StopTouchInferenceArgs> {

    readonly args = touchInferenceArgs
    private readonly characterName: string;


    constructor(
        private readonly entity: Entity,
        manager: InferenceActionManager,
        private touchInteraction: TouchInteraction,
        private readonly stopDetils: StopTouchDetails
    ) {
        const characterName = entity.require(CharacterIdentityKey).name
        super({
            name: stopDetils.name,
            characterId: entity.id,
            layer: 'act',
            before: false
        }, manager)
        this.characterName = characterName;
        this.init();
    }


    protected computeContent(): ActionContent<StopTouchInferenceArgs> {
        return {
            description: this.stopDetils.description,
        }

    }

    handle(args: InferredArgs<StopTouchInferenceArgs>): void {
        if (this.touchInteraction instanceof DuoTouchInteraction) {
            this.touchInteraction.deActivateFromStopAction();
        } else {
            this.touchInteraction.deActivate();
            // Dirtying is handled by the slot (on remove); just flush the regeneration.
            this.entity.get(AvatarKey)?.updateAvatar();
        }
    }
}