import { createStore, produce } from 'solid-js/store'
import type { ChatMessage } from '@gen-adventure/shared'

/**
 * A chat message as rendered. Character replies reveal in sync with TTS playback
 * (karaoke): `revealed` is the white, already-spoken prefix (grows as chunks
 * finish), `playing` is the light-grey chunk currently being voiced, and text
 * after it stays hidden until its audio starts. `finalText` is the authoritative
 * full text (from CHAT_MESSAGE or a typed echo) shown once playback settles or
 * when the reply has no audio at all. Visibility ordering across characters is
 * driven by the global `audioActive` signal (see audio-store) — not stored here.
 */
export interface DisplayMessage {
    messageId: string
    senderId: string
    /** Character display name (empty for user messages) — shown as a label. */
    senderName: string
    role: 'user' | 'character'
    finalText: string | null
    revealed: string
    playing: string | null
    /** Audio length (ms) of the playing chunk — paces the per-character reveal. */
    playingDuration: number
    /** True once playback is done (or interrupted) — show the full finalText. */
    settled: boolean
    /** User barged in mid-reply — freeze the spoken prefix and append the marker. */
    interrupted: boolean
}

const [messages, setMessages] = createStore<DisplayMessage[]>([])

export { messages }

function indexOf(messageId: string): number {
    return messages.findIndex((m) => m.messageId === messageId)
}

/** Upsert the authoritative full text + name (from CHAT_MESSAGE or a typed echo). */
export function upsertFinalText(msg: ChatMessage): void {
    const i = indexOf(msg.messageId)
    if (i === -1) {
        setMessages(
            produce((list) => {
                list.push({
                    messageId: msg.messageId,
                    senderId: msg.senderId,
                    senderName: msg.senderName,
                    role: msg.role,
                    finalText: msg.text,
                    revealed: '',
                    playing: null,
                    playingDuration: 0,
                    settled: false,
                    interrupted: false
                })
            })
        )
    } else {
        setMessages(
            i,
            produce((m) => {
                m.finalText = msg.text
                if (msg.senderName) m.senderName = msg.senderName
            })
        )
    }
}

/** A chunk started playing — create the bubble if needed, set the playing span +
 *  its audio length so the renderer can pace the per-character reveal. */
export function beginChunk(messageId: string, senderId: string, text: string, durationMs: number): void {
    const i = indexOf(messageId)
    if (i === -1) {
        setMessages(
            produce((list) => {
                list.push({
                    messageId,
                    senderId,
                    senderName: '',
                    role: 'character',
                    finalText: null,
                    revealed: '',
                    playing: text,
                    playingDuration: durationMs,
                    settled: false,
                    interrupted: false
                })
            })
        )
    } else {
        setMessages(
            i,
            produce((m) => {
                m.playing = text
                m.playingDuration = durationMs
                m.settled = false
            })
        )
    }
}

/** A chunk finished playing — fold it into the white revealed prefix. */
export function completeChunk(messageId: string): void {
    const i = indexOf(messageId)
    if (i === -1) return
    setMessages(
        i,
        produce((m) => {
            if (m.playing) m.revealed += m.playing
            m.playing = null
            m.playingDuration = 0
        })
    )
}

/** Playback idle — settle the bubble to the authoritative full text. */
export function settleToFinal(messageId: string): void {
    const i = indexOf(messageId)
    if (i === -1) return
    setMessages(
        i,
        produce((m) => {
            // An interrupted bubble is terminal — never overwrite it with the full text
            // (a late replyEnd or idle settle must leave the marker in place).
            if (m.interrupted) return
            if (m.finalText !== null) m.revealed = m.finalText
            m.playing = null
            m.settled = true
        })
    )
}

/** User barged in mid-reply — freeze the spoken prefix and drop the rest. */
export function markInterrupted(messageId: string): void {
    const i = indexOf(messageId)
    if (i === -1) return
    setMessages(
        i,
        produce((m) => {
            if (m.settled) return // already finished normally — nothing to cut
            m.revealed = m.revealed.replace(/\s+$/, '') // trim trailing space for a clean marker
            m.playing = null // cut the in-progress chunk
            m.playingDuration = 0
            m.interrupted = true
            m.settled = true
        })
    )
}

/** Clear all messages — called on ChatPage mount for a fresh chat. */
export function reset(): void {
    setMessages([])
}
