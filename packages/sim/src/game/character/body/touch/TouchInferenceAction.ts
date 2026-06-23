import { ActionContent, arg, CharacterInferenceAction, InferredArgs } from "../../../../core/action-inference/CharacterInferenceAction";
import { InferenceActionManager } from "../../../../core/action-inference/InferenceActionManager";
import { Entity } from "../../../../core/ec/Entity";
import { BehaviorDispatcher } from "../../../behavior/BehaviorDispatcher";
import { EntityRegistry } from "../../../entity/EntityRegistry";
import { EventSystem } from "../../../EventSystem";
import { CharacterIdentityKey } from "../../identity/CharacterIdentity";
import { resolveTargetCharacter } from "../../identity/characterLookup";
import { TouchIntent } from "./behavior/TouchIntent";
import { TouchManagerKey } from "./TouchManager";


const touchInferenceArgs = {
    actingBodyPart: arg.string(),
    targetPersonName: arg.string(),
    targetBodyPart: arg.string(),
    verb: arg.string(),
}

type TouchInferenceArgs = typeof touchInferenceArgs

export class TouchInferenceAction extends CharacterInferenceAction<TouchInferenceArgs> {

    readonly args = touchInferenceArgs
    private readonly characterName: string;

    constructor(
        private readonly entity: Entity,
        private readonly eventSystem: EventSystem,
        manager: InferenceActionManager,
        private readonly registry: EntityRegistry,
        private readonly dispatcher: BehaviorDispatcher,
    ) {
        const characterName = entity.require(CharacterIdentityKey).name
        super({
            name: `${characterName}_interact_body_part`, characterId: entity.id,
            layer: 'act',
            before: false
        }, manager)
        this.characterName = characterName;
        this.init();
    }

    protected computeContent(): ActionContent<TouchInferenceArgs> {
        return {
            description: `When ${this.characterName} interacted with a body part. ex: licking penis with tongue, covering breasts with hands`,
            argDescriptions: {
                actingBodyPart: `The body part that ${this.characterName} is using to touch targetPersonName ex: breasts, mouth, anus, pussy, etc.`,
                targetPersonName: `The name of the person who ${this.characterName} is touching. May be ${this.characterName} or others.`,
                targetBodyPart: `The body part on targetPersonName being interacted with`,
                verb: 'The type of interaction. ex: caress, cover, kiss, grope, finger, penitrate etc.',
            },
        }

    }

    handle(args: InferredArgs<TouchInferenceArgs>): void {
        const targetData = resolveTargetCharacter(this.registry, args.targetPersonName, this.entity)
        if (!targetData) {
            console.log("unable to find target character with name " + args.targetPersonName)
            return;
        }
        const targetEntity = targetData.target


        const touchIntent: TouchIntent = {
            actorId: this.entity.id,
            targetId: targetEntity.id,
            actorPartTag: args.actingBodyPart.trim(),
            targetPartTag: args.targetBodyPart.trim(),
            verb: args.verb
        }


        this.entity.require(TouchManagerKey)
            .applyTouch(touchIntent)



        // this.dispatcher.submit(todo dispatch touch event
        //     alterTouchStateIntent(this.entity.id, targetEntity.id, couchItem.id, state.id),
        //     (success) => {
        //         if (!success) return
        //         this.entity.get(AvatarKey)?.updateAvatar();
        //         targetEntity.get(AvatarKey)?.updateAvatar();
        //     },
        // )
    }
}