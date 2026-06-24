import {
    SimStartData,
    SimResumeData,
    SimStartResult,
    PromptRequest,
    NpcActivationChange,
    SimApi,
    MainApi,
    InferenceAction,
    InferenceInvocation,
    TouchOptions,
    withTimeout,
    nodeEndpoint
} from "@gen-adventure/shared"
import * as Comlink from "comlink"
import type { Remote } from "comlink"

import { Worker } from 'worker_threads'
import { join } from 'path'
import { container, singleton } from "tsyringe"
import { TimeService } from "../time/TimeService";
import { ClothingService } from "../clothing/ClothingService";
import { LocationService } from "../location/LocationService";
import { PoseService } from "../pose/PoseService";
import { TouchService } from "../touch/TouchService";
import { VoxtaClient } from "../../integration/voxta/voxtaClient";
import { NotificationService } from "../notification/NotificationService";

const timeService = container.resolve(TimeService);
const clothingService = container.resolve(ClothingService);
const locationService = container.resolve(LocationService);
const poseService = container.resolve(PoseService);
const touchService = container.resolve(TouchService);
const voxtaClient = container.resolve(VoxtaClient);
const notificationService = container.resolve(NotificationService);

/** How long to wait for the worker's `start()` to resolve before giving up. */
const START_TIMEOUT_MS = 30_000

type ImageRequestHandler = (request: PromptRequest) => void
type NpcActivationHandler = (change: NpcActivationChange) => void
type BackgroundChangedHandler = () => void
type SyncActionHandler = (action: InferenceAction) => void

@singleton()
export class SimManager {
    private worker?: Worker
    private sim?: Remote<SimApi>

    private simRunning = false

    private readonly imageRequestHandlers: ImageRequestHandler[] = []
    private readonly npcActivationHandlers: NpcActivationHandler[] = []
    private readonly backgroundChangedHandlers: BackgroundChangedHandler[] = []
    private readonly syncActionHandlers: SyncActionHandler[] = []

    constructor() { }

    /** The surface the sim worker calls back into (exposed over Comlink). */
    private readonly mainApi: MainApi = {
        imageRequest: (request) => {
            console.log('[SimManager] Received image request from sim:', request)
            for (const handler of this.imageRequestHandlers) {
                handler(request)
            }
        },
        gameTime: (timeMs) => {
            timeService.onGameTimeUpdate(timeMs)
        },

        clothingStateOptions: (characterId, options) => {
            clothingService.onClothingStateOptions(characterId, options)
        },

        locationOptions: (characterId, options) => {
            locationService.onLocationOptions(characterId, options)
        },

        poseOptions: (characterId, options) => {
            poseService.onPoseOptions(characterId, options)
        },

        npcActivationChanged: (change) => {
            for (const handler of this.npcActivationHandlers) {
                handler(change)
            }
        },

        backgroundChanged: () => {
            for (const handler of this.backgroundChangedHandlers) {
                handler()
            }
        },

        syncContext: (context) => {
            void voxtaClient.updateContext(context)
        },

        syncAction: (action) => {
            for (const handler of this.syncActionHandlers) {
                handler(action)
            }
        },

        notification: (notif) => {
            notificationService.onNotification(notif)
        }
    }



    getSim() {
        return this.sim
    }

    private createWorker(): Worker {
        const worker = new Worker(
            join(__dirname, 'worker.js')
        )

        const endpoint = nodeEndpoint(worker)
        Comlink.expose(this.mainApi, endpoint)
        this.sim = Comlink.wrap<SimApi>(endpoint)

        worker.on('error', (error) => {
            console.error(
                'Simulation worker error:',
                error
            )
        })

        worker.on('exit', (code) => {
            this.simRunning = false
            this.worker = undefined
            this.sim = undefined

            console.log(
                `Simulation worker exited with code ${code}`
            )
        })

        return worker
    }

    private getWorker(): Worker {
        if (!this.worker) {
            this.worker = this.createWorker()
        }

        return this.worker
    }

    onImageRequest(handler: ImageRequestHandler): void {
        this.imageRequestHandlers.push(handler)
    }

    onNpcActivationChanged(handler: NpcActivationHandler): void {
        this.npcActivationHandlers.push(handler)
    }

    onBackgroundChanged(handler: BackgroundChangedHandler): void {
        this.backgroundChangedHandlers.push(handler)
    }

    /** Subscribe to inference actions the sim wants registered with Voxta. */
    onSyncAction(handler: SyncActionHandler): void {
        this.syncActionHandlers.push(handler)
    }

    /** Forward a Voxta action invocation down into the running sim. */
    onInvocation(invocation: InferenceInvocation): void {
        void this.sim?.onInvocation(invocation)
    }

    async startSim(
        initData: SimStartData
    ): Promise<SimStartResult> {
        if (this.simRunning) {
            throw new Error('Sim is already running')
        }

        this.getWorker()
        touchService.clear()
        // A hung/dead worker never replies, so the timeout is the safety net.
        const result = await withTimeout(this.sim!.start(initData), START_TIMEOUT_MS, 'sim.start')
        this.simRunning = true
        return result
    }

    async resumeSim(
        resumeData: SimResumeData
    ): Promise<SimStartResult> {
        if (this.simRunning) {
            throw new Error('Sim is already running')
        }

        this.getWorker()
        touchService.clear()
        const result = await withTimeout(this.sim!.resume(resumeData), START_TIMEOUT_MS, 'sim.resume')
        this.simRunning = true
        return result
    }

    setChatId(chatId: string): void {
        void this.sim?.setChatId(chatId)
    }

    clothingStateChangeUiAction(characterId: string, clothingItemId: string, stateId: string): void {
        void this.sim?.clothingStateChangeUiAction(characterId, clothingItemId, stateId)
    }

    moveUiAction(characterId: string, locationId: string): void {
        void this.sim?.moveUiAction(characterId, locationId)
    }

    poseUiAction(characterId: string, poseId: string): void {
        void this.sim?.poseUiAction(characterId, poseId)
    }

    touchUiAction(characterId: string, targetId: string, withId: string, verbId: string): void {
        void this.sim?.touchUiAction(characterId, targetId, withId, verbId)
    }

    async getTouchOptions(characterId: string): Promise<TouchOptions> {
        return (await this.sim?.getTouchOptions(characterId)) ?? { targets: [] }
    }

    async getActiveTouchInteractions(characterId: string): Promise<string[]> {
        return (await this.sim?.getActiveTouchInteractions(characterId)) ?? []
    }

    stopTouchUiAction(characterId: string, interactionId: string): void {
        void this.sim?.stopTouchUiAction(characterId, interactionId)
    }

    async persist(saveName: string, slot: number): Promise<void> {
        await this.sim?.persist(saveName, slot)
    }

    pauseTime(): void {
        void this.sim?.timePause()
    }

    resumeTime(): void {
        void this.sim?.timeResume()
    }

    stopSim(): void {
        void this.terminate()
    }

    private async terminate(): Promise<void> {
        this.simRunning = false

        if (!this.worker) {
            return
        }

        const worker = this.worker

        this.worker = undefined
        this.sim = undefined

        await worker.terminate()
    }
}
