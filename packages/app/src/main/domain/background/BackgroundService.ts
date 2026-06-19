import { singleton } from 'tsyringe'
import { PLAYER_CHARACTER_ID, BACKGROUND_TRANSITION_FADE_MS } from '@gen-adventure/shared'
import type { BackgroundGeneratedEvent, PromptRequest } from '@gen-adventure/shared'
import { SimManager } from '../sim/SimManager'
import { SaveDataService } from '../save/SaveDataService'
import { ComfyConfigStore } from '../../integration/comfyui/comfyConfig'
import { ImageGenerationService } from '../imageGeneration/ImageGenerationService'
import { GenerationActivity } from '../imageGeneration/GenerationActivity'
import { promptHash } from '../imageGeneration/promptHash'
import { toImageUrl } from '../imageGeneration/imageProtocol'
import { applyBlur } from '../imageGeneration/imageBlur'
import type { ImgGenSettings } from '@gen-adventure/shared'

type BackgroundHandler = (event: BackgroundGeneratedEvent) => void
type TransitionHandler = (visible: boolean) => void

/** Resolve after `ms` milliseconds. */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

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
  private readonly transitionHandlers: TransitionHandler[] = []
  /** The last emitted background URL, for replay to a chat page that mounts after
   *  it was emitted (e.g. a cache hit at scenario start). */
  private lastUrl: string | null = null
  /** Prompt hash of the current background, kept so blur can be re-applied on demand. */
  private currentHash: string | null = null

  constructor(
    private readonly sim: SimManager,
    private readonly imageGen: ImageGenerationService,
    private readonly saveData: SaveDataService,
    private readonly config: ComfyConfigStore,
    private readonly activity: GenerationActivity
  ) {
    this.sim.onImageRequest((request) => {
      if (request.type === 'background') void this.handle(request)
    })
    // The player changed location: regenerate the background for their new POV.
    this.sim.onBackgroundChanged(() => void this.regenerateForPlayer())
  }

  /** Regenerate the background from the player's current location. Pauses the sim
   *  and shows an overlay while generating (the sim is live at this point, unlike
   *  scenario start). */
  async regenerateForPlayer(): Promise<void> {
    const sim = this.sim.getSim()
    if (!sim) return
    // Fade the scene to black, generate the new background while it's hidden, then
    // fade back in to reveal it (scene-change transition). GenerationActivity owns
    // the sim pause + loading overlay; counting the background here (alongside the
    // activating avatars) keeps the sim paused / overlay shown until ALL of it is
    // done, whichever finishes last.
    this.setTransition(true)
    this.activity.begin('Generating background...')
    try {
      await delay(BACKGROUND_TRANSITION_FADE_MS) // wait until the screen is black
      const prompt = await sim.getBackgroundPromptForCharacter(PLAYER_CHARACTER_ID)
      await this.handle(prompt)
    } catch (err) {
      console.error('[background] failed to regenerate background:', err)
    } finally {
      this.activity.end() // background unit done (resumes + hides only if it was the last)
      // Hold the black until the activating NPCs' avatars are also ready, so the
      // reveal never happens while characters are still generating.
      await this.activity.whenIdle()
      this.setTransition(false)
    }
  }

  /** Subscribe to generated background events. */
  onBackground(handler: BackgroundHandler): void {
    this.handlers.push(handler)
  }

  /** Subscribe to scene-transition events (true = fade to black, false = fade out). */
  onTransition(handler: TransitionHandler): void {
    this.transitionHandlers.push(handler)
  }

  /** Fan a scene-transition state out to subscribers (the IPC layer → renderer). */
  private setTransition(visible: boolean): void {
    for (const handler of this.transitionHandlers) handler(visible)
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

  /** Delete previously emitted blur files for this hash so the timestamped copies
   *  don't accumulate. Leaves the original `<hash>.png` and `prompt.json`. */
  private async pruneEdited(hash: string): Promise<void> {
    const dir = `img_gen/generated/locations`
    const prefix = `blur_${hash}_`
    for (const name of await this.saveData.listFiles(dir)) {
      if (name.startsWith(prefix)) await this.saveData.delete(`${dir}/${name}`)
    }
  }

  /** Where the most recent background prompt is stored (alongside the images),
   *  so a "regen" can re-roll the prompt that produced the current background.
   *  Location ids don't exist yet, so there's a single most-recent file. */
  private promptRel(): string {
    return `img_gen/generated/locations/prompt.json`
  }

  /**
   * Resolve, cache, and emit a background for a prompt. When `force` is true the
   * disk cache is bypassed and a fresh image is generated with a random seed
   * (used by {@link regenerate} to re-roll an image).
   */
  async handle(request: PromptRequest, force = false): Promise<void> {
    try {
      const hash = promptHash(request.positive, request.negative)
      const originalRel = this.originalRel(hash)
      const settings = await this.config.getImgGenSettings()

      // Remember the prompt so it can be re-rolled later.
      await this.saveData.write(this.promptRel(), JSON.stringify(request))

      // Cache existence is always checked against the unedited original; `force`
      // re-generates.
      if (force || !(await this.saveData.exists(originalRel))) {
        if (!settings.enabled) return // generation off and nothing cached → skip
        const image = await this.imageGen.generate(
          request,
          force ? { forceRandomSeed: true } : undefined
        )
        await this.saveData.writeBytes(originalRel, image.bytes)
      }

      this.currentHash = hash
      await this.emit(hash, settings)
    } catch (err) {
      console.error('[background] failed to handle background request:', err)
    }
  }

  /** Re-roll the current background: re-generate (random seed) from the stored
   *  prompt, falling back to the live sim for the player's location. Pauses the
   *  sim and shows an overlay while generating, like {@link regenerateForPlayer}. */
  async regenerate(): Promise<void> {
    this.activity.begin('Regenerating background...')
    try {
      const request = await this.loadPrompt()
      if (!request) {
        console.warn('[background] no prompt available to regenerate')
        return
      }
      await this.handle(request, true)
    } catch (err) {
      console.error('[background] failed to regenerate background:', err)
    } finally {
      this.activity.end()
    }
  }

  /** The prompt that produced the current background: the stored one, or a
   *  freshly built one from the player's location as a fallback. */
  private async loadPrompt(): Promise<PromptRequest | null> {
    const stored = await this.saveData.read(this.promptRel())
    if (stored) {
      try {
        return JSON.parse(stored) as PromptRequest
      } catch {
        // fall through to the sim fallback below
      }
    }
    const sim = this.sim.getSim()
    if (!sim) return null
    return sim.getBackgroundPromptForCharacter(PLAYER_CHARACTER_ID)
  }

  /** Build the displayed background (blurred if enabled) and emit it. */
  private async emit(hash: string, settings: ImgGenSettings): Promise<void> {
    try {
      const originalRel = this.originalRel(hash)

      let rel = originalRel
      let url: string
      if (settings.blurBackground) {
        const original = await this.saveData.readBytes(originalRel)
        if (!original) return
        const blurred = await applyBlur(original, settings)
        await this.pruneEdited(hash)
        rel = this.blurRel(hash)
        await this.saveData.writeBytes(rel, blurred)
        // The blur filename is already unique per emit (cache-busts itself).
        url = toImageUrl(this.saveData.resolveWithin(rel))
      } else {
        // The original filename is stable, so a regen overwrites the same path —
        // bust the URL so the renderer reloads instead of showing the cached image.
        url = `${toImageUrl(this.saveData.resolveWithin(rel))}?v=${Date.now()}`
      }

      this.lastUrl = url // remember for replay / snapshot
      for (const handler of this.handlers) handler({ url })
    } catch (err) {
      console.error('[background] failed to emit background:', err)
    }
  }
}
