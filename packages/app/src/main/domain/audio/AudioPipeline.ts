import type {
    AudioChunk,
    AudioReplyEnd,
    AudioStartedAck,
    AudioCompleteAck,
    VoxtaServerReplyChunk
} from '@gen-adventure/shared'
import type { VoxtaClient } from '../../integration/voxta/voxtaClient'

/**
 * Downloads each reply chunk's TTS audio in the main process and emits ready-to-play
 * {@link AudioChunk}s to the renderer IN ORDER, even though downloads finish out of
 * order (parallel fetch, serialized emit via a promise chain). Relays playback acks
 * back to Voxta so the server's turn advances, and discards stale work on interrupt.
 *
 * Framework-free (no electron import) — the IPC layer wires the emit callbacks.
 */
export class AudioPipeline {
    /** Serializes emission so chunks reach the renderer in arrival order. */
    private downloadChain: Promise<void> = Promise.resolve()
    /** Bumped on interrupt; downloads that resolve against a stale epoch are dropped. */
    private epoch = 0
    /** Monotonic ordering key handed to the renderer's playback queue. */
    private chunkCounter = 0

    constructor(
        private readonly voxta: VoxtaClient,
        private readonly emitChunk: (chunk: AudioChunk) => void,
        private readonly emitReplyEnd: (event: AudioReplyEnd) => void,
        private readonly emitStop: () => void
    ) {}

    /** Reset the emission chain (used by interrupt). */
    resetChain(): void {
        this.downloadChain = Promise.resolve()
    }

    /** A reply finished streaming (replyEnd) — emit the completion to the renderer
     *  AFTER the message's already-queued chunks, by appending to the same ordered
     *  download chain. The epoch guard drops it if an interrupt has since fired. */
    signalReplyEnd(messageId: string): void {
        const epoch = this.epoch
        this.downloadChain = this.downloadChain.then(() => {
            if (this.epoch !== epoch) return
            this.emitReplyEnd({ messageId })
        })
    }

    /** Download + queue a reply chunk's audio for ordered playback. */
    processReplyChunk(chunk: VoxtaServerReplyChunk): void {
        const index = this.chunkCounter++

        // Silence placeholders (e.g. "silence:680", sent when TTS is off) and
        // chunks with no audio aren't real downloads — ack immediately (duration 0)
        // so the Voxta turn doesn't hang waiting for playback that never happens.
        if (!chunk.audioUrl || chunk.audioUrl.startsWith('silence:')) {
            void this.voxta.speechPlaybackStart(
                chunk.messageId,
                chunk.startIndex,
                chunk.endIndex,
                0,
                chunk.isNarration
            )
            return
        }

        // audioUrl is usually relative — resolve against the REST origin and
        // download here (main) to avoid renderer cross-origin/auth issues.
        const fullUrl = chunk.audioUrl.startsWith('http')
            ? chunk.audioUrl
            : `${this.voxta.voxtaBaseUrl}${chunk.audioUrl}`
        const apiKey = this.voxta.getApiKey()
        const headers: Record<string, string> = {}
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

        // Start the download immediately (parallel), but emit in order via the chain.
        const epoch = this.epoch
        const downloadPromise = fetch(fullUrl, { headers }).then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.arrayBuffer()
        })

        this.downloadChain = this.downloadChain
            .then(() => downloadPromise)
            .then((buf) => {
                // Discarded by an interrupt since this chunk was queued.
                if (this.epoch !== epoch) return
                const b64 = Buffer.from(buf).toString('base64')
                this.emitChunk({
                    messageId: chunk.messageId,
                    senderId: chunk.senderId,
                    index,
                    startIndex: chunk.startIndex,
                    endIndex: chunk.endIndex,
                    isNarration: chunk.isNarration,
                    dataUrl: `data:audio/wav;base64,${b64}`,
                    text: chunk.text
                })
            })
            .catch((err) => {
                console.error(`[Audio] Failed to download ${fullUrl}:`, err)
                // Ack so the server flow doesn't hang on a failed download.
                void this.voxta.speechPlaybackStart(
                    chunk.messageId,
                    chunk.startIndex,
                    chunk.endIndex,
                    0,
                    chunk.isNarration
                )
            })
    }

    /** Renderer reports a chunk began playing — relay start (with real duration) to Voxta. */
    handleAudioStarted(ack: AudioStartedAck): void {
        void this.voxta.speechPlaybackStart(
            ack.messageId,
            ack.startIndex,
            ack.endIndex,
            ack.duration,
            ack.isNarration
        )
    }

    /** Renderer reports a chunk finished playing — relay complete to Voxta. */
    handleAudioComplete(ack: AudioCompleteAck): void {
        void this.voxta.speechPlaybackComplete(ack.messageId)
    }

    /** Discard queued downloads, stop the renderer, and interrupt the server reply. */
    interrupt(): void {
        this.epoch++
        this.resetChain()
        this.emitStop()
        void this.voxta.interrupt()
    }
}
