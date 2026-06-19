import type {
  VoxtaConfig,
  VoxtaCharacterSummary,
  VoxtaScenarioSummary,
  CharacterDetail,
  VoxtaServerMessage,
  SimContextItem
} from '@gen-adventure/shared'

import type {
  CharacterCardDto,
  CharactersResponseDto,
  ScenariosResponseDto
} from './voxtaDtos'

import { mapCharacter, mapCharacterDetail, mapScenario } from './voxtaMappers'
import { mapServerMessage } from './voxtaSignalMappers'
import { VoxtaSignal } from './voxtaSignal'
import { singleton } from 'tsyringe'
import * as voxtaConfig from './config/voxtaConfig'

type ServerMessageHandler = (message: VoxtaServerMessage) => void

/**
 * The seam through which all Voxta REST/hub calls are routed. Holds the current
 * config (including the decrypted API key, in memory only). Returns domain models
 * — it parses the wire DTOs and maps them internally, so callers (the IPC router)
 * never see Voxta's wire format and stay free of business logic.
 *
 * The renderer never talks to Voxta directly — it goes renderer → ipcRouter → here.
 */
@singleton()
export class VoxtaClient {

  /** Owns the SignalR connection, auth/reconnect lifecycle and live session state. */
  private readonly signal: VoxtaSignal
  private readonly messageHandlers: ServerMessageHandler[] = []

  constructor() {
    this.signal = new VoxtaSignal(() => voxtaConfig.getDecrypted())
    // Map raw wire DTOs to domain models once, then fan out to app handlers.
    this.signal.onMessage((dto) => {
      const message = mapServerMessage(dto)
      for (const handler of this.messageHandlers) handler(message)
    })
  }


  /** Subscribe to Voxta hub messages (already mapped to domain models). */
  onMessage(handler: ServerMessageHandler): void {
    this.messageHandlers.push(handler)
  }

  /** The active chat id, or null if no chat has been started. */
  get chatId(): string | null {
    return this.signal.chatId
  }

  /** The active session id, or null if no chat has been started. */
  get sessionId(): string | null {
    return this.signal.sessionId
  }

  /**
   * Start or resume a Voxta chat for the given characters. Brings up the
   * connection, authenticates and registers as needed first. Pass `chatId` to
   * resume an existing chat; omit it to have the server assign a fresh one.
   * Resolves with the active chat id.
   */
  async startChat(characterIds: string[], chatId?: string, scenarioId?: string): Promise<string> {
    const { chatId: activeChatId } = await this.signal.startChat(characterIds, chatId, scenarioId)
    return activeChatId
  }

  /** Send a user-typed message into the active chat (asks for a character reply). */
  async sendUserMessage(text: string): Promise<void> {
    await this.signal.sendUserMessage(text)
  }

  /** Stop the active chat on the server. Best-effort. */
  async stopChat(): Promise<void> {
    await this.signal.stopChat()
  }

  /** Tell Voxta a TTS segment has begun playing (per replyChunk). No-op without a session. */
  async speechPlaybackStart(
    messageId: string,
    startIndex: number,
    endIndex: number,
    duration: number,
    isNarration?: boolean
  ): Promise<void> {
    const sessionId = this.signal.sessionId
    if (!sessionId) return
    await this.signal.send({
      $type: 'speechPlaybackStart',
      sessionId,
      messageId,
      startIndex,
      endIndex,
      duration,
      isNarration
    })
  }

  /** Tell Voxta a TTS segment has finished playing. No-op without a session. */
  async speechPlaybackComplete(messageId: string): Promise<void> {
    const sessionId = this.signal.sessionId
    if (!sessionId) return
    await this.signal.send({ $type: 'speechPlaybackComplete', sessionId, messageId })
  }

  /** Interrupt the active reply (stop generation/playback). No-op without a session. */
  async interrupt(): Promise<void> {
    const sessionId = this.signal.sessionId
    if (!sessionId) return
    await this.signal.send({ $type: 'interrupt', sessionId })
  }

  /** Add a character to the active chat as a participant. No-op without a session. */
  async addChatParticipant(characterId: string): Promise<void> {
    const sessionId = this.signal.sessionId
    if (!sessionId) return
    await this.signal.send({ $type: 'addChatParticipant', sessionId, characterId })
  }

  /** Remove a character from the active chat. No-op without a session. */
  async removeChatParticipant(characterId: string): Promise<void> {
    const sessionId = this.signal.sessionId
    if (!sessionId) return
    await this.signal.send({ $type: 'removeChatParticipant', sessionId, characterId })
  }

  /** Push a sim context item into the active chat's prompt context. No-op without a session. */
  async updateContext(item: SimContextItem): Promise<void> {
    const sessionId = this.signal.sessionId
    if (!sessionId) return
    await this.signal.send({
      $type: 'updateContext',
      sessionId,
      contextKey: item.key,
      contexts: [{ name: item.key, text: item.value }]
    })
  }

  /** REST/WS origin: the configured hub URL with a trailing `/hub` stripped.
   *  Public so the renderer's mic feature can derive the audio-input WS URL. */
  get voxtaBaseUrl(): string {
    return this.baseUrl()
  }

  /** The decrypted API key. MAIN PROCESS ONLY — only ever handed to the renderer
   *  transiently inside a recording-start event so it can open the mic WS. */
  getApiKey(): string {
    return voxtaConfig.getDecrypted().apiKey
  }

  /** REST origin: the configured hub URL with a trailing `/hub` stripped. */
  private baseUrl(): string {
    return voxtaConfig.getDecrypted().url.replace(/\/hub\/?$/, '').replace(/\/$/, '')
  }

  /** Authenticated GET against the Voxta REST API, returning parsed JSON. */
  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl()}${path}`, {
      headers: { Authorization: `Bearer ${voxtaConfig.getDecrypted().apiKey}` }
    })
    if (!res.ok) {
      throw new Error(`Voxta request failed: ${res.status} ${res.statusText} (${path})`)
    }
    return (await res.json()) as T
  }

  async listCharacters(): Promise<VoxtaCharacterSummary[]> {
    const data = await this.request<CharactersResponseDto>('/api/characters/?assistant=true')
    return data.characters.map(mapCharacter)
  }

  async listScenarios(): Promise<VoxtaScenarioSummary[]> {
    const data = await this.request<ScenariosResponseDto>('/api/scenarios')
    return data.scenarios.map(mapScenario)
  }

  async getCharacter(characterId: string): Promise<CharacterDetail> {
    const dto = await this.request<CharacterCardDto>(`/api/characters/${characterId}`)
    return mapCharacterDetail(dto, characterId)
  }
}
