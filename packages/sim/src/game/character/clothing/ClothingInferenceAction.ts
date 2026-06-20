import { ActionContent, arg, CharacterInferenceAction, InferredArgs, optional } from "../../../core/action-inference/CharacterInferenceAction"
import { InferenceActionManager } from "../../../core/action-inference/InferenceActionManager"
import { Entity } from "../../../core/ec/Entity"
import { EntityRegistry } from "../../entity/EntityRegistry"
import { EventSystem } from "../../EventSystem"
import { buildAvatarPrompt } from "../characterViews"
import { CharacterIdentityKey } from "../identity/CharacterIdentity"
import { resolveTargetCharacter } from "../identity/characterLookup"
import { ClothingManager, ClothingManagerKey } from "./ClothingManager"



const clothingInferenceArgs = {
    subjectName: arg.string({ description: 'The name of the person whose clothing changed.' }),
    clothingName: arg.string({ description: 'Clothing item that was altered. parse whatever it is into a single word.' }),
    clothingState: arg.string({ description: 'New state: opened, lifted, removed, lowered, pulled down, unzipped, etc.' }),
}

type ClothingInferenceArgs = typeof clothingInferenceArgs

export class ClothingInferenceAction extends CharacterInferenceAction<ClothingInferenceArgs> {

    readonly args = clothingInferenceArgs
    private readonly characterName: string;

    constructor(
        private entity: Entity,
        private eventSystem: EventSystem,
        manager: InferenceActionManager,
        private readonly registry: EntityRegistry,
    ) {
        const characterName = entity.require(CharacterIdentityKey).name
        super({
            name: `${characterName}_alter_clothing_state`, characterId: entity.id,
            layer: 'act',
            before: false
        }, manager)
        this.characterName = characterName;
        this.init();
    }

    protected computeContent(): ActionContent<ClothingInferenceArgs> {
        return {
            description: `When ${this.characterName} alteres the state of a piece of clothing. Do NOT call this if its only a request, command, or hypothetical`,
            //   shortDescription: 'follow',
            argDescriptions: {
                subjectName: 'The name of the person whose clothing changed.',
                clothingName: 'Clothing item that was altered. parse whatever it is into a single word.',
                clothingState: 'New state: opened, lifted, removed, lowered, pulled down, unzipped, etc.',
            },
        }

    }

    handle(args: InferredArgs<ClothingInferenceArgs>): void {
        console.log("ACTION CALLED: " + JSON.stringify(args))
        const targetData = resolveTargetCharacter(this.registry, args.subjectName, this.entity)
        if (!targetData) {
            console.log("unable to find target character with name " + args.subjectName)
            return;
        }
        const targetEntity = targetData.target


        const clothingItem = targetEntity.require(ClothingManagerKey).getClothingItemByTag(args.clothingName)
        if (!clothingItem) {
            console.log("unable to find clothing item with tag " + args.clothingName)
            return;
        }

        const state = clothingItem.getStateByTag(args.clothingState)
        if (!state) {
            console.log(`unable to find clothing item state with tag ${args.clothingState} on ${clothingItem.id}`)
            return;
        }

        clothingItem.setStateById(state.id)

        this.eventSystem.emit("image.request", buildAvatarPrompt(targetEntity))
    }
}