import { randomUUID } from 'crypto'
import WebSocket from 'ws'
import { container, singleton } from 'tsyringe'
import type { ComfyGenericSettings, PromptRequest } from '@gen-adventure/shared'
import type {
  GenerateCallbacks,
  GenerateOptions,
  ImageBytes,
  ImageProvider
} from '../../domain/imageGeneration/ImageProvider'
import { ComfyConfigStore } from './comfyConfig'
import { setByPath } from './workflowPath'
import { toWidthHeight } from './aspectRatio'

/** A ComfyUI `/view` image reference from an `executed` node output. */
interface ComfyImageRef {
  filename: string
  subfolder: string
  type: string
}

/** State tracked for one in-flight prompt while we await its result. */
interface PendingPrompt {
  onPreview: GenerateCallbacks['onPreview']
  resolve: (image: ImageBytes) => void
  reject: (err: Error) => void
}

const RECONNECT_DELAY_MS = 2000
const GENERATION_TIMEOUT_MS = 5 * 60 * 1000

/**
 * ComfyUI provider. Maintains a single persistent WebSocket (one stable
 * `clientId`) that auto-reconnects if ComfyUI restarts, and routes progress /
 * preview / result frames back to the prompt that is currently executing. Each
 * `generate` clones the configured workflow, mutates the bound JSONPaths from the
 * request + settings, POSTs `/prompt`, and resolves with the final image bytes.
 */
@singleton()
export class ComfyUiClient implements ImageProvider {
  private readonly config = container.resolve(ComfyConfigStore)
  private readonly clientId = randomUUID()

  private socket: WebSocket | null = null
  private connectedUrl = ''
  private reconnectTimer: NodeJS.Timeout | null = null

  /** prompt_id → pending handlers, for prompts awaiting completion. */
  private readonly pending = new Map<string, PendingPrompt>()
  /** prompt_id of the node block currently executing (for routing previews). */
  private executingPromptId: string | null = null

  async generate(
    request: PromptRequest,
    callbacks: GenerateCallbacks,
    options?: GenerateOptions
  ): Promise<ImageBytes> {
    const settings = await this.config.getGenericSettings()
    if (!settings.selectedWorkflow) {
      throw new Error('No ComfyUI workflow selected')
    }
    const workflow = await this.config.getWorkflowJson(settings.selectedWorkflow)
    if (!workflow) {
      throw new Error(`Workflow not found: ${settings.selectedWorkflow}`)
    }
    const bindings = await this.config.getBindings(settings.selectedWorkflow)

    // Clone, then mutate the bound paths from the request + settings.
    const prompt = structuredClone(workflow) as Record<string, unknown>
    const targetPixels =
      request.type === 'avatar' ? settings.avatarTargetPixels : settings.backgroundTargetPixels
    const { width, height } = toWidthHeight(request.aspectRatio, targetPixels)
    const seed = options?.forceRandomSeed || settings.seed === -1 ? randomSeed() : settings.seed

    // Prepend the per-workflow prompt overrides.
    const positive = prependOverride(bindings.positivePromptOverride, request.positive)
    const negative = prependOverride(bindings.negativePromptOverride, request.negative)

    setByPath(prompt, bindings.positivePromptPath, positive)
    setByPath(prompt, bindings.negativePromptPath, negative)
    setByPath(prompt, bindings.widthPath, width)
    setByPath(prompt, bindings.heightPath, height)
    setByPath(prompt, bindings.seedPath, seed)

    await this.ensureSocket(settings)

    console.log('[comfyui] submitting prompt', { positive, negative })
    const promptId = await this.submit(settings, prompt)

    return new Promise<ImageBytes>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(promptId)
        reject(new Error('ComfyUI generation timed out'))
      }, GENERATION_TIMEOUT_MS)

      this.pending.set(promptId, {
        onPreview: settings.usePreviews ? callbacks.onPreview : () => {},
        resolve: (image) => {
          clearTimeout(timeout)
          resolve(image)
        },
        reject: (err) => {
          clearTimeout(timeout)
          reject(err)
        }
      })
    })
  }

  /** POST the prompt and return its assigned `prompt_id`. */
  private async submit(
    settings: ComfyGenericSettings,
    prompt: Record<string, unknown>
  ): Promise<string> {
    const res = await fetch(`${httpBase(settings.url)}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, client_id: this.clientId })
    })
    if (!res.ok) {
      throw new Error(`ComfyUI /prompt failed: ${res.status} ${await res.text()}`)
    }
    const data = (await res.json()) as { prompt_id: string }
    return data.prompt_id
  }

  // ---- WebSocket lifecycle ----

  /** Ensure a live socket to the configured URL, reconnecting if the URL changed. */
  private ensureSocket(settings: ComfyGenericSettings): Promise<void> {
    const url = `${wsBase(settings.url)}/ws?clientId=${this.clientId}`

    if (this.socket && this.connectedUrl === url) {
      if (this.socket.readyState === WebSocket.OPEN) return Promise.resolve()
      if (this.socket.readyState === WebSocket.CONNECTING) {
        return new Promise((resolve) => this.socket!.once('open', () => resolve()))
      }
    }

    this.connectedUrl = url
    return this.connect(url)
  }

  private connect(url: string): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    const socket = new WebSocket(url)
    this.socket = socket

    socket.on('message', (data: WebSocket.RawData, isBinary: boolean) =>
      this.onMessage(data, isBinary)
    )
    socket.on('close', () => this.scheduleReconnect(url))
    socket.on('error', (err) => {
      console.error('[comfyui] socket error:', err.message)
      socket.close()
    })

    return new Promise((resolve) => {
      socket.once('open', () => {
        console.log('[comfyui] socket connected')
        resolve()
      })
      // If the initial connect fails, resolve anyway — `submit` will surface the
      // real error, and the socket auto-reconnects in the background.
      socket.once('error', () => resolve())
    })
  }

  private scheduleReconnect(url: string): void {
    if (this.reconnectTimer || this.connectedUrl !== url) return
    console.log('[comfyui] socket closed; reconnecting…')
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect(url)
    }, RECONNECT_DELAY_MS)
  }

  // ---- Frame routing ----

  private onMessage(data: WebSocket.RawData, isBinary: boolean): void {
    if (isBinary) {
      this.handlePreview(data as Buffer)
      return
    }
    try {
      const msg = JSON.parse(data.toString()) as { type: string; data: Record<string, unknown> }
      this.handleJson(msg)
    } catch {
      // ignore non-JSON text frames
    }
  }

  /** Binary preview frame: [4B event type][4B image format][image bytes…]. */
  private handlePreview(buf: Buffer): void {
    if (buf.length < 8) return
    const eventType = buf.readUInt32BE(0)
    if (eventType !== 1) return // 1 = PREVIEW_IMAGE
    const format = buf.readUInt32BE(4) // 1 = JPEG, 2 = PNG
    const bytes = buf.subarray(8)
    const ext = format === 2 ? 'png' : 'jpg'

    const pending = this.executingPromptId
      ? this.pending.get(this.executingPromptId)
      : undefined
    pending?.onPreview({ bytes, ext })
  }

  private handleJson(msg: { type: string; data: Record<string, unknown> }): void {
    switch (msg.type) {
      case 'executing':
        this.executingPromptId = (msg.data.prompt_id as string) ?? this.executingPromptId
        break
      case 'executed': {
        const promptId = msg.data.prompt_id as string
        const output = msg.data.output as { images?: ComfyImageRef[] } | undefined
        const image = output?.images?.[0]
        if (promptId && image) void this.deliverFinal(promptId, image)
        break
      }
      case 'execution_error': {
        const promptId = msg.data.prompt_id as string
        const pending = this.pending.get(promptId)
        if (pending) {
          this.pending.delete(promptId)
          pending.reject(new Error(`ComfyUI execution error: ${JSON.stringify(msg.data)}`))
        }
        break
      }
      default:
        break
    }
  }

  /** Download a finished image via `/view` and resolve its pending prompt. */
  private async deliverFinal(promptId: string, image: ComfyImageRef): Promise<void> {
    const pending = this.pending.get(promptId)
    if (!pending) return
    this.pending.delete(promptId)

    try {
      const settings = await this.config.getGenericSettings()
      const params = new URLSearchParams({
        filename: image.filename,
        subfolder: image.subfolder ?? '',
        type: image.type ?? 'output'
      })
      const res = await fetch(`${httpBase(settings.url)}/view?${params.toString()}`)
      if (!res.ok) throw new Error(`ComfyUI /view failed: ${res.status}`)
      const bytes = Buffer.from(await res.arrayBuffer())
      const ext = image.filename.split('.').pop() || 'png'
      pending.resolve({ bytes, ext })
    } catch (err) {
      pending.reject(err instanceof Error ? err : new Error(String(err)))
    }
  }
}

function randomSeed(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
}

/** Prepend a per-workflow prompt override to the request prompt, skipping empty overrides. */
function prependOverride(override: string, base: string): string {
  return override.trim() ? `${override.trim()}, ${base}` : base
}

/** Normalise a configured URL to an `http(s)://host[:port]` base (no trailing /). */
function httpBase(url: string): string {
  return url.replace(/\/+$/, '')
}

/** Derive the `ws(s)://host[:port]` base from the configured http URL. */
function wsBase(url: string): string {
  return httpBase(url).replace(/^http/, 'ws')
}
