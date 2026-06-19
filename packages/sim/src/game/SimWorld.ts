import { Lifecycle, scoped } from "tsyringe";
import * as fs from "fs";
import * as path from "path";
import {
    buildManifest,
    CURRENT_SAVE_VERSION,
    serializeManifest,
    serializeSaveDocument,
    type PromptRequest,
    type SaveDocument,
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
import { EventSystem } from "./EventSystem";
import { ContextManager } from "../core/context/ContextManager";
import { LocationManager } from "./location/LocationManager";


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
        private readonly eventSystem: EventSystem,
        private readonly time: Time,
        worldState: WorldState,
        private readonly mainSync: MainSync,
        public readonly registry: EntityRegistry,
        public readonly locationManager: LocationManager,
        public readonly contextManager: ContextManager,
        private readonly characterSpawner: CharacterSpawner,
        scheduler: Scheduler,
    ) {
        this.systems = [eventSystem, time, mainSync, characterSpawner]
        this.worldSaveables = [time, worldState, scheduler]
    }

    /** Second boot phase: the whole graph is constructed, so systems can emit
     *  their initial events with every subscriber in place. */
    init(): void {
        for (const system of this.systems) {
            system.init?.()
        }
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
