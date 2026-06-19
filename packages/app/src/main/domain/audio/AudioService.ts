import { container, singleton } from 'tsyringe'
import type {
    AudioChunk,
    AudioStartedAck,
    AudioCompleteAck,
    RecordingStartEvent,
    VoxtaServerMessage,
    VoxtaServerReplyChunk,
    VoxtaServerRecordingRequest
} from '@gen-adventure/shared'
import { VoxtaClient } from '../../integration/voxta/voxtaClient'
import { AudioPipeline } from './AudioPipeline'

const voxtaClient = container.resolve(VoxtaClient)

type PlayHandler = (chunk: AudioChunk) => void
type StopHandler = () => void
type RecordingStartHandler = (event: RecordingStartEvent) => void
type RecordingStopHandler = () => void

/**
 * The audio concern's voice on the Voxta session. Independently subscribes to the
 * Voxta message bus (alongside ChatService, which owns text assembly) and handles
 * the audio-relevant messages: it feeds `replyChunk`s to the {@link AudioPipeline}
 * for ordered TTS playback, and fans `recordingRequest`s out as mic start/stop
 * events. The IPC layer bridges its callbacks to the renderer.
 */
@singleton()
export class AudioService {
    private readonly pipeline: AudioPipeline
    private readonly playHandlers: PlayHandler[] = []
    private readonly stopHandlers: StopHandler[] = []
    private readonly recordingStartHandlers: RecordingStartHandler[] = []
    private readonly recordingStopHandlers: RecordingStopHandler[] = []

    constructor() {
        this.pipeline = new AudioPipeline(
            voxtaClient,
            (chunk) => this.emit(this.playHandlers, chunk),
            () => this.emit(this.stopHandlers, undefined)
        )
        voxtaClient.onMessage((message) => this.handleServerMessage(message))
    }

    /** Subscribe to ordered, ready-to-play TTS chunks. */
    onPlayAudio(handler: PlayHandler): void {
        this.playHandlers.push(handler)
    }

    /** Subscribe to "stop all playback" (interrupt) signals. */
    onStopAudio(handler: StopHandler): void {
        this.stopHandlers.push(handler)
    }

    /** Subscribe to "begin mic capture" requests (carries the mic WS credentials). */
    onRecordingStart(handler: RecordingStartHandler): void {
        this.recordingStartHandlers.push(handler)
    }

    /** Subscribe to "stop mic capture" requests. */
    onRecordingStop(handler: RecordingStopHandler): void {
        this.recordingStopHandlers.push(handler)
    }

    /** Renderer reported a chunk started playing. */
    audioStarted(ack: AudioStartedAck): void {
        this.pipeline.handleAudioStarted(ack)
    }

    /** Renderer reported a chunk finished playing. */
    audioComplete(ack: AudioCompleteAck): void {
        this.pipeline.handleAudioComplete(ack)
    }

    /** Stop playback + discard queued downloads (e.g. on quit). */
    interrupt(): void {
        this.pipeline.interrupt()
    }

    private handleServerMessage(message: VoxtaServerMessage): void {
        switch (message.$type) {
            case 'replyChunk':
                this.pipeline.processReplyChunk(message as VoxtaServerReplyChunk)
                break
            case 'recordingRequest': {
                const m = message as VoxtaServerRecordingRequest
                if (m.enabled) {
                    this.emit(this.recordingStartHandlers, {
                        sessionId: m.sessionId,
                        voxtaBaseUrl: voxtaClient.voxtaBaseUrl,
                        apiKey: voxtaClient.getApiKey()
                    })
                } else {
                    this.emit(this.recordingStopHandlers, undefined)
                }
                break
            }
            default:
                break
        }
    }

    private emit<T>(handlers: ((arg: T) => void)[], arg: T): void {
        for (const handler of handlers) handler(arg)
    }
}
