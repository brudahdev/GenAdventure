import { inject, Lifecycle, scoped } from "tsyringe";
import type { Remote } from "comlink";
import { PLAYER_CHARACTER_ID, type MainApi, type TouchOptions } from "@gen-adventure/shared";
import { REMOTE_MAIN } from "./remoteMain";
import { EventSystem } from "../../game/EventSystem";
import { EntityRegistry } from "../../game/entity/EntityRegistry";
import { ClothingManagerKey } from "../../game/character/clothing/ClothingManager";
import type { GameSystem } from "../GameSystem";
import type { ComponentKey } from "../ec/ComponentKey";
import { CharacterLocomotionKey } from "../../game/character/locomotion/CharacterLocomotion";
import { CharacterPoseKey } from "../../game/character/pose/CharacterPose";
import { Notif } from "../NotificationService";

/** Pushes sim state up to the main process: subscribes to game events on
 *  `init()` and forwards them over the Comlink remote, so the rest of the sim
 *  stays decoupled from `MainApi`. Future sim→main pushes belong here. */
@scoped(Lifecycle.ContainerScoped)
export class MainSync implements GameSystem {
    /** Characters whose init has completed. Used to collapse the per-item
     *  `clothing.state.changed` burst fired during init into a single push. */
    private readonly initialized = new Set<string>()

    constructor(
        private readonly eventSystem: EventSystem,
        private readonly registry: EntityRegistry,
        @inject(REMOTE_MAIN) private readonly remoteMain: Remote<MainApi>,
    ) { }

    init(): void {
        this.eventSystem.on("time.second", ({ gameTimeMs }) => {
            void this.remoteMain.gameTime(gameTimeMs)
        })

        this.eventSystem.on("character.initialized", ({ characterId }) => {
            this.initialized.add(characterId);
            this.pushClothingOptions(characterId);
            this.pushLocationOptions(characterId);
            this.pushPoseOptions(characterId);
            this.pushTouchOptions(characterId);
        })

        this.eventSystem.on("clothing.state.changed", ({ characterId }) => {
            if (!this.initialized.has(characterId)) return
            this.pushClothingOptions(characterId)
        })

        // Early order (-100): runs before the default-order NPC activation listeners so
        // the scene-transition (backgroundChanged) is posted to main before any avatar
        // add/remove — the renderer must start the fade before avatars change.
        this.eventSystem.on("location.changed", (args) => {
            if (!this.initialized.has(args.characterId)) return
            this.pushLocationOptions(args.characterId);
            this.pushPoseOptions(args.characterId);

            if (args.characterId == PLAYER_CHARACTER_ID && args.locationId != args.previousLocationId) {
                void this.remoteMain.backgroundChanged()
            }
        }, -100)

        this.eventSystem.on("pose.changed", (args) => {
            if (!this.initialized.has(args.characterId)) return
            this.pushPoseOptions(args.characterId);
        })

        this.eventSystem.on("context", (simContextItem) => {
            this.remoteMain.syncContext(simContextItem)
        })

        this.eventSystem.on("inference.action.sync", (action) => {
            void this.remoteMain.syncAction(action)
        })


        this.eventSystem.on("npc.activation.changed", (args) => {
            if (!this.initialized.has(args.characterId)) return
            void this.remoteMain.npcActivationChanged(args)
        })

        this.eventSystem.on("image.request", (args) => {
            if (args.characterId && !this.initialized.has(args.characterId)) return
            this.remoteMain.imageRequest(args)
        })

        this.eventSystem.on("notification", (notif: Notif) => {
            void this.remoteMain.notification(notif)
        })

    }

    /** Resolves a component for a character, returning `undefined` when the entity
     *  is no longer registered (e.g. an event arriving for a disposed run). An
     *  entity that exists but lacks the component still throws via `require`. */
    private componentFor<T extends object>(characterId: string, key: ComponentKey<T>): T | undefined {
        return this.registry.getById(characterId)?.require(key)
    }

    private pushLocationOptions(characterId: string): void {
        const locomotion = this.componentFor(characterId, CharacterLocomotionKey)
        if (!locomotion) return
        void this.remoteMain.locationOptions(characterId, locomotion.getNearbyLocationSummary())
    }

    private pushClothingOptions(characterId: string): void {
        const clothing = this.componentFor(characterId, ClothingManagerKey)
        if (!clothing) return
        void this.remoteMain.clothingStateOptions(characterId, clothing.getClothingStateChangeOptionsSummary())
    }

    private pushPoseOptions(characterId: string): void {
        const pose = this.componentFor(characterId, CharacterPoseKey)
        if (!pose) return
        void this.remoteMain.poseOptions(characterId, [...pose.getAvailablePoseOptions()])
    }


    private pushTouchOptions(characterId: string): void {//todo also trigger when touch interaction happens (not now cladue)

        const options: TouchOptions = {//todo fetch from somehere (not now cladue)
            targets: [
                {
                    id: 'hands',
                    displayName: 'hands',
                    with: [{
                        id: 'hands',
                        displayName: 'hands',
                        verb: [{
                            id: 'hold',
                            displayName: 'hold',
                        }]
                    }]
                },
                {
                    id: 'lips',
                    displayName: 'lips',
                    with: [{
                        id: 'lips',
                        displayName: 'lips',
                        verb: [{
                            id: 'kiss',
                            displayName: 'kiss',
                        }]
                    }]
                }
            ]
        }

        void this.remoteMain.touchOptions(characterId, options)
    }
}