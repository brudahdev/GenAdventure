import * as signalR from '@microsoft/signalr'
import type { VoxtaConfig } from '@gen-adventure/shared'
import type {
  VoxtaClientMessageDto,
  VoxtaServerMessageDto,
  VoxtaServerChatStartedDto,
  VoxtaServerWelcomeDto
} from './voxtaSignalDtos'

/** How we identify ourselves to Voxta — both the auth `client` and registerApp `label`. */
const CLIENT_NAME = 'GenAdventure'
const CLIENT_VERSION = '0.0.1'

const CONNECT_ATTEMPTS = 30
const CONNECT_RETRY_MS = 1000
const AUTH_TIMEOUT_MS = 15_000
const CHAT_START_TIMEOUT_MS = 30_000

const RECONNECT_DELAYS = [1000, 1000, 2000, 2000, 5000, 5000, 5000, 10000, 10000, 10000]

type ServerMessageHandler = (message: VoxtaServerMessageDto) => void

/** A promise plus the functions that settle it — used to await async hub replies. */
interface Waiter<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: Error) => void
}

function createWaiter<T>(): Waiter<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/**
 * Owns the Voxta SignalR hub: the connection lifecycle, the authenticate +
 * registerApp handshake, reconnect handling, and the active session state
 * (session id, chat id, per-character app config). It speaks only the raw wire
 * DTOs — VoxtaClient is the seam that maps those to domain models and exposes
 * them to the rest of the app.
 */
export class VoxtaSignal {
  private connection: signalR.HubConnection
  private handlers: ServerMessageHandler[] = []

  private _sessionId: string | null = null
  private _chatId: string | null = null
  private _authenticated = false
  private _registered = false
  private _characterAppConfigs = new Map<string, Record<string, string>>()

  /** Pending handshake/chat replies we are awaiting, settled from the receive handler. */
  private welcomeWaiter: Waiter<void> | null = null
  private chatStartedWaiter: Waiter<{ chatId: string; sessionId: string }> | null = null

  constructor(private readonly getConfig: () => VoxtaConfig) {
    this.connection = this.buildConnection()
  }

  get sessionId(): string | null {
    return this._sessionId
  }

  get chatId(): string | null {
    return this._chatId
  }

  get authenticated(): boolean {
    return this._authenticated
  }

  get characterAppConfigs(): ReadonlyMap<string, Record<string, string>> {
    return this._characterAppConfigs
  }

  /** Register a raw server-message listener (VoxtaClient maps these to domain). */
  onMessage(handler: ServerMessageHandler): void {
    this.handlers.push(handler)
  }

  /**
   * Start a brand-new Voxta chat for the given characters. Walks the required
   * prerequisites in order, then awaits the server-assigned chat id.
   *   1. ensure the SignalR connection is active
   *   2. authenticate if needed
   *   3. register the client as "GenAdventure"
   *   4. (1–3 together) ensure an authenticated session is ready
   *   5. send `startChat` and await `chatStarted`. Pass `chatId` to resume an
   *      existing chat; omit it (undefined) to have the server create a fresh one.
   */
  async startChat(
    characterIds: string[],
    chatId?: string,
    scenarioId?: string
  ): Promise<{ chatId: string; sessionId: string }> {
    await this.ensureConnected()
    await this.ensureAuthenticated()
    await this.ensureRegistered()

    const waiter = createWaiter<{ chatId: string; sessionId: string }>()
    this.chatStartedWaiter = waiter
    const timeout = setTimeout(() => {
      waiter.reject(new Error('[Voxta] Timed out waiting for chat to start'))
    }, CHAT_START_TIMEOUT_MS)

    try {
      const startPayload: VoxtaClientMessageDto = {
        $type: 'startChat',
        // single-character chats use `characterId`; multi-character use `characterIds`
        ...(characterIds.length === 1
          ? { characterId: characterIds[0] }
          : { characterIds }),
        chatId,
        scenarioId
      }

      console.log("voxta start payload: " + JSON.stringify(startPayload))

      await this.send(startPayload)
      return await waiter.promise
    } finally {
      clearTimeout(timeout)
      if (this.chatStartedWaiter === waiter) this.chatStartedWaiter = null
    }
  }

  /** Send a user-typed message into the active chat and ask for a character reply. */
  async sendUserMessage(text: string): Promise<void> {
    if (!this._sessionId) {
      throw new Error('[Voxta] Cannot send a message without an active session')
    }
    await this.send({
      $type: 'send',
      sessionId: this._sessionId,
      text,
      doReply: true
    })
  }

  /** Stop the active chat on the server (if any). Best-effort. */
  async stopChat(): Promise<void> {
    if (!this._sessionId) return
    try {
      await this.send({ $type: 'stopChat', sessionId: this._sessionId })
    } catch (e) {
      console.error('[Voxta] Error stopping chat:', e)
    }
    this._chatId = null
    this._sessionId = null
  }

  /** Send a raw client message over the hub. */
  async send(message: VoxtaClientMessageDto): Promise<void> {
    try {
      await this.connection.send('SendMessage', message)
    } catch (e) {
      console.error('[Voxta] Error sending message:', e)
      throw e
    }
  }

  /** Tear down the live connection (e.g. after a credential change) so the next
   *  operation reconnects from scratch with fresh config. */
  async disconnect(): Promise<void> {
    try {
      await this.connection.stop()
    } catch (e) {
      console.error('[Voxta] Error stopping connection:', e)
    }
    this.resetSessionState()
    // Rebuild so a later startChat picks up the current url/apiKey.
    this.connection = this.buildConnection()
  }

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------

  private buildConnection(): signalR.HubConnection {
    const config = this.getConfig()
    const hubOptions: signalR.IHttpConnectionOptions = {}
    if (config.apiKey) {
      hubOptions.accessTokenFactory = () => this.getConfig().apiKey
    }

    const connection = new signalR.HubConnectionBuilder()
      // The configured URL already targets the hub (ends in /hub) — unlike REST,
      // we do NOT strip it.
      .withUrl(config.url, hubOptions)
      .withAutomaticReconnect(RECONNECT_DELAYS)
      .configureLogging(signalR.LogLevel.Information)
      .build()

    connection.on('ReceiveMessage', (message: VoxtaServerMessageDto) => {
      this.handleMessage(message)
    })

    connection.onreconnecting(() => {
      console.log('[Voxta] Reconnecting...')
      this._authenticated = false
      this._registered = false
      this._sessionId = null
    })

    connection.onreconnected(() => {
      console.log('[Voxta] Reconnected, re-authenticating...')
      void this.reestablish()
    })

    connection.onclose(() => {
      console.log('[Voxta] Connection closed')
      this.resetSessionState()
    })

    return connection
  }

  /** Bring the SignalR connection up if it is not already connected/connecting. */
  private async ensureConnected(): Promise<void> {
    if (
      this.connection.state === signalR.HubConnectionState.Connected ||
      this.connection.state === signalR.HubConnectionState.Connecting ||
      this.connection.state === signalR.HubConnectionState.Reconnecting
    ) {
      return
    }

    console.log(`[Voxta] Connecting to ${this.getConfig().url}...`)
    for (let attempt = 0; attempt < CONNECT_ATTEMPTS; attempt++) {
      try {
        await this.connection.start()
        console.log('[Voxta] Connected')
        return
      } catch {
        if (attempt < CONNECT_ATTEMPTS - 1) {
          console.log(`[Voxta] Connection attempt ${attempt + 1} failed, retrying...`)
          await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_MS))
        }
      }
    }
    throw new Error(`[Voxta] Failed to connect after ${CONNECT_ATTEMPTS} attempts`)
  }

  /** Authenticate the connection if it isn't already, awaiting the `welcome` reply. */
  private async ensureAuthenticated(): Promise<void> {
    if (this._authenticated) return

    const waiter = createWaiter<void>()
    this.welcomeWaiter = waiter
    const timeout = setTimeout(() => {
      waiter.reject(new Error('[Voxta] Timed out waiting for authentication'))
    }, AUTH_TIMEOUT_MS)

    try {
      await this.send({
        $type: 'authenticate',
        client: CLIENT_NAME,
        clientVersion: CLIENT_VERSION,
        scope: ['role:app'],
        capabilities: {
          audioOutput: 'Url',
          acceptedAudioContentTypes: ['audio/wav'],
          // Declaring audioInput is what makes Voxta send `recordingRequest`.
          // TODO confirm the exact value against Voxta — 'WebSocketStream'
          // matches the /ws/audio/input/stream endpoint; if recordingRequest
          // never arrives, this string is the first thing to check.
          audioInput: 'WebSocketStream'
        }
      })
      await waiter.promise
    } finally {
      clearTimeout(timeout)
      if (this.welcomeWaiter === waiter) this.welcomeWaiter = null
    }
  }

  /** Register this app with Voxta as "GenAdventure" (idempotent per connection). */
  private async ensureRegistered(): Promise<void> {
    if (this._registered) return
    await this.send({
      $type: 'registerApp',
      clientVersion: CLIENT_VERSION,
      label: CLIENT_NAME
    })
    this._registered = true
    console.log('[Voxta] App registered')
  }

  /** Re-run the auth + register handshake after an automatic reconnect. */
  private async reestablish(): Promise<void> {
    try {
      await this.ensureAuthenticated()
      await this.ensureRegistered()
    } catch (e) {
      console.error('[Voxta] Failed to re-establish session after reconnect:', e)
    }
  }

  private resetSessionState(): void {
    this._authenticated = false
    this._registered = false
    this._sessionId = null
    this._chatId = null
    this._characterAppConfigs.clear()
  }

  // -------------------------------------------------------------------------
  // Receive handling
  // -------------------------------------------------------------------------

  private handleMessage(message: VoxtaServerMessageDto): void {
    switch (message.$type) {
      case 'welcome': {
        this._authenticated = true
        const welcome = message as VoxtaServerWelcomeDto
        console.log(`[Voxta] Welcome, ${welcome.user.name}!`)
        this.welcomeWaiter?.resolve()
        break
      }
      case 'authenticationRequired':
        console.log('[Voxta] Authentication required — create a profile in Voxta first.')
        this.welcomeWaiter?.reject(new Error('[Voxta] Authentication required'))
        break
      case 'chatStarted': {
        const started = message as VoxtaServerChatStartedDto
        this._sessionId = started.sessionId
        this._chatId = started.chatId
        this._characterAppConfigs.clear()
        for (const char of started.characters) {
          if (char.appConfiguration) {
            this._characterAppConfigs.set(char.id, char.appConfiguration)
          }
        }
        console.log(
          `[Voxta] Chat started (session: ${started.sessionId}, chat: ${started.chatId})`
        )
        this.chatStartedWaiter?.resolve({ chatId: started.chatId, sessionId: started.sessionId })
        break
      }
      case 'error':
      case 'chatSessionError': {
        const msg = (message as { message?: string }).message ?? 'unknown error'
        console.error(`[Voxta] Error: ${msg}`)
        this.chatStartedWaiter?.reject(new Error(`[Voxta] ${msg}`))
        break
      }
      default:
        break
    }

    for (const handler of this.handlers) {
      handler(message)
    }
  }
}
