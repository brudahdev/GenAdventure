import { ActionContent, arg, CharacterInferenceAction, InferredArgs, optional } from "../../../core/action-inference/CharacterInferenceAction"
import { InferenceActionManager } from "../../../core/action-inference/InferenceActionManager"
import { Entity } from "../../../core/ec/Entity"
import { CharacterIdentityKey } from "../identity/CharacterIdentity"



const clothingInferenceArgs = {
    subjectName: arg.string({ description: 'The name of the person whose clothing changed.' }),
    clothingName: arg.string({ description: 'Clothing item that was altered. parse whatever it is into a single word.' }),
    clothingState: arg.string({ description: 'New state: opened, lifted, removed, lowered, pulled down, unzipped, etc.' }),
}

type ClothingInferenceArgs = typeof clothingInferenceArgs

export class ClothingInferenceAction extends CharacterInferenceAction<ClothingInferenceArgs> {

    readonly args = clothingInferenceArgs
    private readonly characterName: string;

    constructor(entity: Entity, manager: InferenceActionManager) {
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
    }
}