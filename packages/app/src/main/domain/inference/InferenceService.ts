import { container, singleton } from "tsyringe";
import type {
    InferenceAction,
    InferenceInvocation,
    VoxtaServerAction,
    VoxtaServerMessage
} from "@gen-adventure/shared";
import { VoxtaClient } from "../../integration/voxta/voxtaClient";
import { SimManager } from "../sim/SimManager";
import { CharacterService } from "../character/CharacterService";

const voxtaClient = container.resolve(VoxtaClient);
const simManager = container.resolve(SimManager);
const characterService = container.resolve(CharacterService);

/**
 * Bridges inference actions between the sim and Voxta in both directions:
 *  - outbound: actions the sim wants live (`SimManager.onSyncAction`) are tracked
 *    and registered with Voxta via `voxtaClient.syncAction`.
 *  - inbound: Voxta `action` messages (invocations) are converted to the sim
 *    `InferenceInvocation` model and dispatched into the run.
 *
 * Holds no IPC of its own — resolved at startup so its subscriptions are live.
 */
@singleton()
export class InferenceService {
    /** The actions currently registered with Voxta, keyed by action name. Lets a
     *  future session (re)start re-sync everything that's live. */
    private readonly registered = new Map<string, InferenceAction>()

    constructor() {
        simManager.onSyncAction((action) => this.register(action))
        voxtaClient.onMessage((message) => this.handleServerMessage(message))
    }

    /** Track and (re)register an action with Voxta, tagging it with the acting
     *  character's role name so Voxta scopes it to that role. */
    private register(action: InferenceAction): void {
        this.registered.set(action.name, action)
        const roleName = characterService.getScenarioCharacterById(action.characterId)?.roleName
        void voxtaClient.syncAction(action, roleName)
    }

    private handleServerMessage(message: VoxtaServerMessage): void {
        if (message.$type !== 'action') return
        const action = message as VoxtaServerAction
        const invocation: InferenceInvocation = {
            value: action.value,
            arguments: action.arguments
        }
        simManager.onInvocation(invocation)
    }
}
