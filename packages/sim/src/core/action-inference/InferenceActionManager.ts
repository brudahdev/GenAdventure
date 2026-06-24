import { Lifecycle, scoped } from "tsyringe";
import type { InferenceAction, InferenceInvocation } from "@gen-adventure/shared";
import { CharacterInferenceAction, decodeArgs } from "./CharacterInferenceAction";
import { EventSystem } from "../../game/EventSystem";

@scoped(Lifecycle.ContainerScoped)
export class InferenceActionManager {//todo removing actions, removing on character deactivate

    private handlerMap = new Map<string, CharacterInferenceAction>();
    private characterActionMap = new Map<string, CharacterInferenceAction>();

    private pushedInitialActions = false;
    constructor(private readonly eventSystem: EventSystem) {

    }

    registerAction(action: CharacterInferenceAction) {
        this.characterActionMap.set(action.getCharacterId(), action)
        this.handlerMap.set(getInvocationValue(action), action)
    }

    removeAction(action: CharacterInferenceAction) {
        this.eventSystem.emit("inference.action.sync", {
            ...this.toInferenceAction(action),
            disabled: true,
        })

    }


    async onInvocation(invocation: InferenceInvocation) {
        console.log("InferenceActionManager - ACTION CALLED: " + JSON.stringify(invocation))
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

    /** Pushes the action's current definition toward Voxta: emits a game event
     *  that MainSync forwards to main, where it is mapped to a Voxta DTO and
     *  registered over the hub. */
    syncAction(action: CharacterInferenceAction) {
        if (!this.pushedInitialActions) {
            return;
        }
        this.eventSystem.emit("inference.action.sync", this.toInferenceAction(action))
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
            disabled: false
        }
    }

    pushInitialActions() {
        this.pushedInitialActions = true;
        for (const action of this.handlerMap.values()) {
            this.syncAction(action)
        }
    }
}

function getInvocationValue(action: CharacterInferenceAction) {
    return `${action.getName()}`
}
