import { container, singleton } from "tsyringe";
import type {
    ChatMessage,
    VoxtaServerMessage,
    VoxtaServerReplyStart,
    VoxtaServerReplyChunk,
    VoxtaServerReplyEnd,
    VoxtaServerSpeechRecognitionPartial,
    VoxtaServerSpeechRecognitionEnd
} from "@gen-adventure/shared";
import { VoxtaClient } from "../../integration/voxta/voxtaClient";
import { AudioService } from "../audio/AudioService";
import { CharacterService } from "../character/CharacterService";

const voxtaClient = container.resolve(VoxtaClient);
const audioService = container.resolve(AudioService);
const characterService = container.resolve(CharacterService);

type ChatMessageHandler = (message: ChatMessage) => void
type PartialTextHandler = (text: string) => void

/**
 * The chat domain's voice on the Voxta session. It owns the in-flight assembly of
 * streamed character replies (replyStart → replyChunk* → replyEnd) into whole
 * {@link ChatMessage}s, sends user-typed messages back to Voxta, and fans the
 * finished character messages out to subscribers (the IPC layer pushes them to
 * the renderer).
 */
@singleton()
export class ChatService {
    private chatId: string | null = null
    /** Partially-received character replies, keyed by Voxta messageId. */
    private readonly pending = new Map<string, { senderId: string; text: string }>()
    private readonly messageHandlers: ChatMessageHandler[] = []
    private readonly partialHandlers: PartialTextHandler[] = []
    /** Disambiguates synthesized ids for recognized-speech user messages. */
    private userMessageSeq = 0

    constructor() {
        voxtaClient.onMessage((message) => this.handleServerMessage(message))
    }

    async onChatStarted(chatId: string) {
        this.chatId = chatId
    }

    getChatId() {
        return this.chatId
    }

    /** Subscribe to fully-assembled character messages. */
    onChatMessage(handler: ChatMessageHandler): void {
        this.messageHandlers.push(handler)
    }

    /** Subscribe to partial speech recognition text (incremental ASR chunks). */
    onPartialText(handler: PartialTextHandler): void {
        this.partialHandlers.push(handler)
    }

    /** Send a user-typed message to Voxta (no-op on empty/whitespace). */
    async sendUserMessage(text: string): Promise<void> {
        const trimmed = text.trim()
        if (!trimmed) return
        // Barge-in: stop the current TTS playback, discard queued downloads, and tell
        // Voxta to abandon the in-flight reply before this new turn is sent.
        audioService.interrupt()
        await voxtaClient.sendUserMessage(trimmed)
    }

    /** Tear down the active Voxta chat. */
    async quit(): Promise<void> {
        this.pending.clear()
        this.chatId = null
        // Stop any in-flight TTS playback + discard queued downloads before the chat goes away.
        audioService.interrupt()
        await voxtaClient.stopChat()
    }

    private handleServerMessage(message: VoxtaServerMessage): void {
        switch (message.$type) {
            case 'replyStart': {
                const m = message as VoxtaServerReplyStart
                this.pending.set(m.messageId, { senderId: m.senderId, text: '' })
                break
            }
            case 'replyChunk': {
                const m = message as VoxtaServerReplyChunk
                const entry = this.pending.get(m.messageId)
                if (entry) entry.text += m.text
                break
            }
            case 'replyEnd': {
                const m = message as VoxtaServerReplyEnd
                const entry = this.pending.get(m.messageId)
                this.pending.delete(m.messageId)
                if (!entry) break
                this.emit({
                    messageId: m.messageId,
                    senderId: entry.senderId,
                    senderName: characterService.getCachedName(entry.senderId) ?? '',
                    text: entry.text,
                    role: 'character'
                })
                break
            }
            case 'speechRecognitionPartial': {
                const m = message as VoxtaServerSpeechRecognitionPartial
                const text = m.text ?? ''
                for (const h of this.partialHandlers) h(text)
                break
            }
            case 'speechRecognitionEnd': {
                // The user's spoken turn — send it to Voxta so the character replies,
                // and echo it visually. The audio WS handles ASR only; the client must
                // explicitly send the recognized text to trigger the dialog turn.
                const m = message as VoxtaServerSpeechRecognitionEnd
                const text = m.text?.trim()
                if (!text) break
                void this.sendUserMessage(text)
                this.emit({
                    messageId: `user-${Date.now()}-${this.userMessageSeq++}`,
                    senderId: 'user',
                    senderName: '',
                    text,
                    role: 'user'
                })
                break
            }
            default:
                break
        }
    }

    private emit(message: ChatMessage): void {
        for (const handler of this.messageHandlers) handler(message)
    }
}
