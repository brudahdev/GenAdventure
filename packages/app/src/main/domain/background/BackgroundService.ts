import { singleton } from 'tsyringe'
import type { BackgroundGeneratedEvent, PromptRequest } from '@gen-adventure/shared'
import { SimManager } from '../sim/SimManager'
import { SaveDataService } from '../save/SaveDataService'
import { ComfyConfigStore } from '../../integration/comfyui/comfyConfig'
import { ImageGenerationService } from '../imageGeneration/ImageGenerationService'
import { promptHash } from '../imageGeneration/promptHash'
import { toImageUrl } from '../imageGeneration/imageProtocol'
import { applyBlur } from '../imageGeneration/imageBlur'
import type { ImgGenSettings } from '@gen-adventure/shared'

type BackgroundHandler = (event: BackgroundGeneratedEvent) => void

/**
 * Owns background image requests coming from the sim. Caches generated images on
 * disk under `img_gen/generated/locations/<hash>.png` (keyed by a prompt hash) and fans the
 * resulting {@link BackgroundGeneratedEvent}s out to subscribers (the IPC layer →
 * renderer). An optional Gaussian blur is applied on emit; the blurred copy is
 * written alongside the unedited original as `blur_<hash>_<ts>.png` and recomputed
 * on every emit so a settings change can be re-applied without regenerating.
 *
 * Location ids don't exist yet, so all backgrounds share a single flat folder.
 */
@singleton()
export class BackgroundService {
  private readonly handlers: BackgroundHandler[] = []
  /** The last emitted background URL, for replay to a chat page that mounts after
   *  it was emitted (e.g. a cache hit at scenario start). */
  private lastUrl: string | null = null
  /** Prompt hash of the current background, kept so blur can be re-applied on demand. */
  private currentHash: string | null = null

  constructor(
    private readonly sim: SimManager,
    private readonly imageGen: ImageGenerationService,
    private readonly saveData: SaveDataService,
    private readonly config: ComfyConfigStore
  ) {
    this.sim.onImageRequest((request) => {
      if (request.type === 'background') void this.handle(request)
    })
  }

  /** Subscribe to generated background events. */
  onBackground(handler: BackgroundHandler): void {
    this.handlers.push(handler)
  }

  /** The currently displayed background URL, or null if none. */
  getCurrent(): string | null {
    return this.lastUrl
  }

  /** Forget the current background (e.g. when a new scenario starts). */
  clear(): void {
    this.lastUrl = null
    this.currentHash = null
  }

  /** Re-apply the current blur settings to the active background and re-emit it —
   *  no regeneration. */
  async recalculate(): Promise<void> {
    if (this.currentHash === null) return
    const settings = await this.config.getImgGenSettings()
    await this.emit(this.currentHash, settings)
  }

  private originalRel(hash: string): string {
    return `img_gen/generated/locations/${hash}.png`
  }

  private blurRel(hash: string): string {
    return `img_gen/generated/locations/blur_${hash}_${Date.now()}.png`
  }

  async handle(request: PromptRequest): Promise<void> {
    try {
      const hash = promptHash(request.positive, request.negative)
      const originalRel = this.originalRel(hash)
      const settings = await this.config.getImgGenSettings()

      // Cache existence is always checked against the unedited original.
      if (!(await this.saveData.exists(originalRel))) {
        if (!settings.enabled) return // generation off and nothing cached → skip
        const image = await this.imageGen.generate(request)
        await this.saveData.writeBytes(originalRel, image.bytes)
      }

      this.currentHash = hash
      await this.emit(hash, settings)
    } catch (err) {
      console.error('[background] failed to handle background request:', err)
    }
  }

  /** Build the displayed background (blurred if enabled) and emit it. */
  private async emit(hash: string, settings: ImgGenSettings): Promise<void> {
    try {
      const originalRel = this.originalRel(hash)

      let rel = originalRel
      if (settings.blurBackground) {
        const original = await this.saveData.readBytes(originalRel)
        if (!original) return
        const blurred = await applyBlur(original, settings)
        rel = this.blurRel(hash)
        await this.saveData.writeBytes(rel, blurred)
      }

      const url = toImageUrl(this.saveData.resolveWithin(rel))
      this.lastUrl = url // remember for replay / snapshot
      for (const handler of this.handlers) handler({ url })
    } catch (err) {
      console.error('[background] failed to emit background:', err)
    }
  }
}
