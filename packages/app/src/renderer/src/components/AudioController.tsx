import { onMount, onCleanup, createEffect } from 'solid-js'
import type { AudioChunk, RecordingStartEvent } from '@gen-adventure/shared'
import { SpatialAudioEngine } from '../services/SpatialAudioEngine'
import { AudioInputService } from '../services/AudioInputService'
import {
    micMuted,
    speakerMuted,
    setPlaybackStatus,
    setRecordingStatus,
    setSpeakingCharacterId
} from '../stores/audio-store'
import { beginChunk, completeChunk, settleToFinal, markInterrupted } from '../stores/chat-store'

/**
 * Invisible component that drives streamed TTS playback and mic voice input for
 * the chat. Mounted inside ChatPage, so it tears down (releasing the mic and
 * stopping playback) when the user leaves the chat.
 *
 * Playback: queues AudioChunks (ordered by `index`) and plays them sequentially
 * through the SpatialAudioEngine, acking start/complete back to main (→ Voxta).
 * Mic: on the server's recording-start event, streams the mic straight to Voxta.
 */
export default function AudioController() {
    onMount(() => {
        const queue: AudioChunk[] = []
        const engine = new SpatialAudioEngine()
        let isPlaying = false
        // The message whose chunk is currently playing (for stop/mute settling).
        let currentMessageId: string | null = null
        // The last message that began voicing — settled when a new speaker starts.
        let lastVoicedId: string | null = null
        // Replies whose audio stream has ended (replyEnd reached, after the last chunk)
        // but whose final chunk may still be queued/playing — settled by trySettle.
        const endedMessages = new Set<string>()

        // Begin voicing a chunk: settle the previous speaker first so it ends as full
        // white text before the next character's reply starts revealing. `durationMs`
        // is the clip length, used to pace the per-character reveal.
        function startVoicing(chunk: AudioChunk, durationMs: number): void {
            if (lastVoicedId && lastVoicedId !== chunk.messageId) settleToFinal(lastVoicedId)
            lastVoicedId = chunk.messageId
            setSpeakingCharacterId(chunk.senderId)
            beginChunk(chunk.messageId, chunk.senderId, chunk.text, durationMs)
        }

        // Settle a reply to its full text once its stream has ended AND its last chunk
        // has finished — deterministic, replacing the old debounced timer. No-ops while
        // the message is still playing or has queued chunks (deferred until it drains).
        function trySettle(messageId: string): void {
            if (!endedMessages.has(messageId)) return
            if (currentMessageId === messageId) return
            if (queue.some((c) => c.messageId === messageId)) return
            endedMessages.delete(messageId)
            settleToFinal(messageId)
            if (!isPlaying && queue.length === 0) setSpeakingCharacterId(null)
        }

        function ack(messageId: string, index: number): void {
            void window.electronAPI.audio.complete({ messageId, index })
        }

        function onChunkDone(chunk: AudioChunk): void {
            isPlaying = false
            currentMessageId = null
            completeChunk(chunk.messageId)
            ack(chunk.messageId, chunk.index)
            if (queue.length === 0) setPlaybackStatus('off')
            // Settle now if this was the reply's last chunk and its stream already ended;
            // otherwise the reply-end signal (or the next chunk) drives it.
            trySettle(chunk.messageId)
            playNext()
        }

        function playNext(): void {
            if (isPlaying || queue.length === 0) return

            // Main emits in order, but sort defensively on the per-reply index key.
            queue.sort((a, b) => a.index - b.index)
            const chunk = queue.shift()
            if (!chunk) return

            // Speaker muted — skip real playback but still ack (start+complete) so the
            // server flow advances, and reveal the text instantly (no karaoke timing).
            if (speakerMuted()) {
                startVoicing(chunk, 0)
                completeChunk(chunk.messageId)
                void window.electronAPI.audio.started({
                    messageId: chunk.messageId,
                    index: chunk.index,
                    startIndex: chunk.startIndex,
                    endIndex: chunk.endIndex,
                    duration: 0,
                    isNarration: chunk.isNarration
                })
                ack(chunk.messageId, chunk.index)
                trySettle(chunk.messageId)
                playNext()
                return
            }

            isPlaying = true
            currentMessageId = chunk.messageId
            setPlaybackStatus('playing')

            engine
                .playChunk(chunk.dataUrl)
                .then(({ duration, onEnded }) => {
                    // Audio has started — reveal this chunk, paced over its clip length.
                    startVoicing(chunk, duration)
                    void window.electronAPI.audio.started({
                        messageId: chunk.messageId,
                        index: chunk.index,
                        startIndex: chunk.startIndex,
                        endIndex: chunk.endIndex,
                        duration,
                        isNarration: chunk.isNarration
                    })
                    return onEnded
                })
                .then(() => {
                    onChunkDone(chunk)
                })
                .catch((err) => {
                    console.error('[Audio] Play failed:', err)
                    onChunkDone(chunk)
                })
        }

        const unsubPlay = window.electronAPI.audio.onPlay((chunk) => {
            queue.push(chunk)
            playNext()
        })

        // A reply's audio stream is complete — settle once its last chunk has played
        // (deferred via endedMessages while chunks are still queued/playing).
        const unsubReplyEnd = window.electronAPI.audio.onReplyEnd((event) => {
            endedMessages.add(event.messageId)
            trySettle(event.messageId)
        })

        const unsubStop = window.electronAPI.audio.onStop(() => {
            // Instant interrupt — clear the queue, cut current playback, and replace the
            // in-progress chunk (+ unspoken tail) with the *Interrupted* marker. Target
            // the active reply, falling back to the last voiced one for the inter-chunk
            // gap; markInterrupted no-ops if that message already settled normally.
            queue.length = 0
            engine.stop()
            isPlaying = false
            endedMessages.clear()
            const target = currentMessageId ?? lastVoicedId
            if (target) markInterrupted(target)
            currentMessageId = null
            lastVoicedId = null
            setPlaybackStatus('off')
            setSpeakingCharacterId(null)
        })

        // --- Mic input ---
        const audioInput = new AudioInputService()
        // Whether the server currently wants recording (independent of user mute).
        let serverRecordingEnabled = false
        let lastRecordingEvent: RecordingStartEvent | null = null

        const unsubRecStart = window.electronAPI.audio.onRecordingStart((event) => {
            serverRecordingEnabled = true
            lastRecordingEvent = event
            if (!micMuted()) {
                audioInput.handleRecordingRequest(true, event.sessionId, event.voxtaBaseUrl, event.apiKey)
                setRecordingStatus('listening')
            } else {
                // Track the session but don't start streaming while muted.
                audioInput.sessionId = event.sessionId
                setRecordingStatus('paused')
            }
        })

        const unsubRecStop = window.electronAPI.audio.onRecordingStop(() => {
            serverRecordingEnabled = false
            audioInput.handleRecordingRequest(false, audioInput.sessionId ?? '', '', null)
            setRecordingStatus('paused')
        })

        // React to mic mute toggle.
        createEffect(() => {
            const muted = micMuted()
            if (muted && audioInput.enabled && !audioInput.paused) {
                audioInput.pauseStreaming()
                setRecordingStatus('paused')
            } else if (!muted && serverRecordingEnabled && lastRecordingEvent) {
                if (audioInput.enabled && audioInput.paused) {
                    audioInput.resumeStreaming()
                    setRecordingStatus('listening')
                } else if (!audioInput.enabled) {
                    audioInput.handleRecordingRequest(
                        true,
                        lastRecordingEvent.sessionId,
                        lastRecordingEvent.voxtaBaseUrl,
                        lastRecordingEvent.apiKey
                    )
                    setRecordingStatus('listening')
                }
            }
        })

        // React to speaker mute — cut current playback immediately if muted mid-play.
        createEffect(() => {
            if (speakerMuted()) {
                queue.length = 0
                engine.stop()
                isPlaying = false
                endedMessages.clear()
                if (currentMessageId) settleToFinal(currentMessageId)
                currentMessageId = null
                lastVoicedId = null
                setPlaybackStatus('off')
                setSpeakingCharacterId(null)
            }
        })

        onCleanup(() => {
            unsubPlay()
            unsubReplyEnd()
            unsubStop()
            unsubRecStart()
            unsubRecStop()
            audioInput.dispose()
            engine.dispose()
            setPlaybackStatus('off')
            setRecordingStatus('off')
            setSpeakingCharacterId(null)
        })
    })

    return null
}
