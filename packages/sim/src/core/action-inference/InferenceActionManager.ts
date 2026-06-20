import { Lifecycle, scoped } from "tsyringe";
import { CharacterInferenceAction, decodeArgs } from "./CharacterInferenceAction";

@scoped(Lifecycle.ContainerScoped)
export class InferenceActionManager {
    private handlerMap = new Map<string, CharacterInferenceAction>();
    private characterActionMap = new Map<string, CharacterInferenceAction>();

    constructor() {

    }

    registerAction(action: CharacterInferenceAction) {
        this.characterActionMap.set(action.getCharacterId(), action)
        this.handlerMap.set(getInvocationValue(action), action)
    }


    async onInvocation(invocation: InferenceInvocation) {
        const handler = this.handlerMap.get(invocation.value)
        if (!handler) {
            console.log("InferenceActionManager unable to find handler for " + invocation.value)
            return
        }

        let args
        try {
            args = decodeArgs(handler.args, invocation.arguments ?? [])
        } catch (err) {
            console.log(`InferenceActionManager failed to decode arguments for ${invocation.value}: ${err}`)
            return
        }

        await handler.handle(args)
    }

    syncAction(action: CharacterInferenceAction) {
        //todo convert to InferenceAction, send in game event, mainSync push to main, main translate into voxta dto and send signal message 
    }

    /** Maps a registered action into its outbound DTO (description, short
     *  description and argument descriptions reflect the action's current
     *  computed content). */
    toInferenceAction(action: CharacterInferenceAction): InferenceAction {
        return {
            characterId: action.getCharacterId(),
            name: action.getName(),
            description: action.getDescription(),
            layer: action.getLayer(),
            before: action.getBefore(),
            arguments: action.resolveArguments(),
            shortDescription: action.getShortDescription(),
        }
    }
}

function getInvocationValue(action: CharacterInferenceAction) {
    return `action:${action.getName()}`
}


//todo move all these types to shared 

export interface InferenceAction {
    characterId: string;
    name: string;
    description: string;
    layer: string;
    before: boolean;
    arguments?: InferenceArgument[];
    shortDescription?: string;
}




export interface InferenceArgument {
    name: string;
    type: InferenceArgumentType;
    description?: string;
    required?: boolean;
}


export type InferenceArgumentType = 'Undefined' | 'String' | 'Integer' | 'Double' | 'Boolean';





export interface InferenceInvocation {
    value: string
    arguments?: InferenceInvocationArgument[]
}

export interface InferenceInvocationArgument {
    name: string
    value: string
}
