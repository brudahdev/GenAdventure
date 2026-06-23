import { Lifecycle, scoped } from "tsyringe";
import * as fs from "fs";
import * as path from "path";
import {
    buildManifest,
    CURRENT_SAVE_VERSION,
    PLAYER_CHARACTER_ID,
    serializeManifest,
    serializeSaveDocument,
    type PromptRequest,
    type SaveDocument,
    type TouchOptions,
} from "@gen-adventure/shared";
import type { GameSystem } from "../core/GameSystem";
import type { WorldSaveable } from "../core/save/Saveable";
import { atomicWriteFileSync } from "../core/save/atomicWrite";
import { MainSync } from "../core/bridge/MainSync";
import { Time } from "../core/time/Time";
import { Scheduler } from "../core/time/Scheduler";
import { EntityRegistry } from "./entity/EntityRegistry";
import { CharacterSpawner } from "./entity/CharacterSpawner";
import { WorldState } from "./world/WorldState";
import { buildAvatarPrompt, buildBackgroundPrompt } from "./character/characterViews";
import { buildTouchOptions } from "./character/body/touch/touchOptions";
import { getDuoInteractions, getSoloInteractions } from "./character/body/touch/config/touchInteractionData";
import { EventSystem } from "./EventSystem";
import { ContextManager } from "../core/context/ContextManager";
import { LocationManager } from "./location/LocationManager";
import { InferenceActionManager } from "../core/action-inference/InferenceActionManager";
import { BehaviorTreeRunner, type OnSettle } from "../core/bt/BehaviorTreeRunner";
import { BehaviorDispatcher } from "./behavior/BehaviorDispatcher";
import type { ActorIntent } from "./plan/planDefs";
import { NotificationService } from "../core/NotificationService";


/** The root of a single sim run. Resolving it from a run's child container drives
 *  construction of the whole graph (time, locations, characters) in dependency
 *  order, and exposes the operations the worker's `SimApi` delegates to. One
 *  `SimWorld` per run keeps runs isolated and disposable. `CharacterSpawner`
 *  pulls in `LocationManager` (via the location factory), so locations are built
 *  before characters resolve their starting location. The `EntityRegistry` is a
 *  passive store the spawner populates; queries read through it. */
@scoped(Lifecycle.ContainerScoped)
export class SimWorld {
    /** The run's systems in lifecycle order: `init()` runs front-to-back,
     *  `dispose()` back-to-front (so the event bus is cleared last). Adding a
     *  system = one constructor param + one entry here. */
    private readonly systems: GameSystem[]

    /** Systems that contribute a slice of `world` save state, keyed by `saveKey`.
     *  Separate from {@link systems} (the lifecycle list) because not every
     *  world-saver has a tick lifecycle and not every system persists. */
    private readonly worldSaveables: WorldSaveable[]

    constructor(
        readonly eventSystem: EventSystem,
        readonly time: Time,
        readonly worldState: WorldState,
        readonly registry: EntityRegistry,
        readonly locationManager: LocationManager,
        readonly contextManager: ContextManager,
        readonly inferenceActionManager: InferenceActionManager,
        readonly characterSpawner: CharacterSpawner,
        readonly scheduler: Scheduler,
        readonly behaviorRunner: BehaviorTreeRunner,
        readonly behaviorDispatcher: BehaviorDispatcher,
        readonly notificationService: NotificationService,
        private readonly mainSync: MainSync,
    ) {
        this.systems = [eventSystem, time, behaviorRunner, mainSync, characterSpawner]
        this.worldSaveables = [time, worldState, scheduler]
    }

    /** Submit a top-level intent. It selects + parameterizes a behaviour tree that
     *  the runner steps across ticks. `onSettle` fires when the tree finishes
     *  (`true` = succeeded). The entry point both intent sources (UI handler,
     *  inference handler) funnel through. */
    submitIntent(intent: ActorIntent, onSettle?: OnSettle): void {
        this.behaviorDispatcher.submit(intent, onSettle)
    }

    /** Second boot phase: the whole graph is constructed, so systems can emit
     *  their initial events with every subscriber in place. */
    init(): void {
        for (const system of this.systems) {
            system.init?.()
        }
        this.notificationService.activate();
    }

    /** Tears down the run in reverse lifecycle order: stops the time interval
     *  and finally drops all event listeners so an abandoned world can't keep
     *  ticking. */
    dispose(): void {
        for (let i = this.systems.length - 1; i >= 0; i--) {
            this.systems[i].dispose?.()
        }
    }

    getActiveNpcs(): string[] {
        return this.characterSpawner.getActiveNpcs().map(entity => entity.id)
    }

    getBackgroundPromptForCharacter(characterId: string): PromptRequest {
        return buildBackgroundPrompt(this.registry.requireById(characterId))
    }

    getAvatarPromptForCharacter(characterId: string): PromptRequest {
        return buildAvatarPrompt(this.registry.requireById(characterId))
    }

    /** A character's touch options: solo interactions for the player (acting on
     *  self), duo interactions for an NPC (player acting on them). Filtered to the
     *  parts both bodies actually have. */
    getTouchOptions(characterId: string): TouchOptions {
        const player = this.registry.getById(PLAYER_CHARACTER_ID)
        const target = this.registry.getById(characterId)
        if (!player || !target) return { targets: [] }

        const interactions = characterId === PLAYER_CHARACTER_ID
            ? getSoloInteractions()
            : getDuoInteractions()
        return buildTouchOptions(player, target, interactions)
    }

    persist(savePath: string, chatId: string, slot: number): void {
        // World state from each world-saver, keyed by its save-key; entity state
        // from each entity's Saveable components.
        const world: Record<string, unknown> = {}
        for (const saveable of this.worldSaveables) {
            world[saveable.saveKey] = saveable.save()
        }

        const doc: SaveDocument = {
            version: CURRENT_SAVE_VERSION,
            meta: { chatId, slot, savedAt: Date.now(), gameTimeMs: this.time.getTimeMs() },
            world,
            entities: this.registry.all().map(entity => entity.save()),
        }

        // Body first, then the listing manifest: a crash between the two leaves
        // a manifest-less save that listing still reads from the (valid) body.
        fs.mkdirSync(savePath, { recursive: true })
        atomicWriteFileSync(path.join(savePath, 'game.json'), serializeSaveDocument(doc))
        atomicWriteFileSync(path.join(savePath, 'manifest.json'), serializeManifest(buildManifest(doc)))
        console.log(`[sim] saved to ${path.join(savePath, 'game.json')}`)
    }

    timePause(): void {
        this.time.pause()
    }

    timeResume(): void {
        this.time.resume()
    }
}
