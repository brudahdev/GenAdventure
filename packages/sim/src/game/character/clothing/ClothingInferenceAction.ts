import { ActionContent, arg, CharacterInferenceAction, InferredArgs, optional } from "../../../core/action-inference/CharacterInferenceAction"
import { InferenceActionManager } from "../../../core/action-inference/InferenceActionManager"



const clothingInferenceArgs = {
    destination: arg.string({ description: 'static dest desc' }),
    speed: optional(arg.integer()),
}

type ClothingInferenceArgs = typeof clothingInferenceArgs

export class ClothingInferenceAction extends CharacterInferenceAction<ClothingInferenceArgs> {
    readonly args = clothingInferenceArgs

    constructor(manager: InferenceActionManager, characterId = 'npc-1') {
        super({ name: 'follow', characterId, layer: 'act', before: false }, manager)
    }

    protected computeContent(): ActionContent<ClothingInferenceArgs> {
        return {
            description: `follow `,
            //   shortDescription: 'follow',
            argDescriptions: { destination: `where to go (current:` },
        }

    }

    handle(args: InferredArgs<ClothingInferenceArgs>): void {
        console.log("ACTION CALLED: " + JSON.stringify(args))
    }
}