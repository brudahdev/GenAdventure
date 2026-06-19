import { singleton } from 'tsyringe'
import type { AvatarGeneratedEvent, ImgGenSettings, PromptRequest } from '@gen-adventure/shared'
import { SimManager } from '../sim/SimManager'
import { SaveDataService } from '../save/SaveDataService'
import { ComfyConfigStore } from '../../integration/comfyui/comfyConfig'
import { ImageGenerationService } from '../imageGeneration/ImageGenerationService'
import { promptHash } from '../imageGeneration/promptHash'
import { toImageUrl } from '../imageGeneration/imageProtocol'
import { applyTransparency } from '../imageGeneration/imageTransparency'

type AvatarHandler = (event: AvatarGeneratedEvent) => void
type AvatarRemovedHandler = (characterId: string) => void

/** An avatar currently shown for a character, kept so transparency can be
 *  re-applied to all avatars on demand and so the current state can be replayed
 *  to a chat page that mounts after the avatar was emitted. */
interface ActiveAvatar {
  characterId: string
  hash: string
  /** The last emitted `genimg://` URL, set once `emit()` has run. */
  url?: string
}

/** Append a transparency clause to a prompt, skipping empty clauses. */
function appendPrompt(base: string, extra: string): string {
  return extra.trim() ? `${base}, ${extra.trim()}` : base
}

/**
 * Owns avatar image requests coming from the sim. Resolves the owning character,
 * caches generated images on disk under
 * `img_gen/generated/characters/<characterId>/<hash>.png` (keyed by a prompt hash), applies
 * chroma-key transparency on emit, and fans the resulting
 * {@link AvatarGeneratedEvent}s out to subscribers (the IPC layer → renderer).
 *
 * Cache existence is always checked against the unedited `<hash>.png`; the
 * transparency-applied `trans_<hash>.png` is (re)computed on every emit so a
 * change to the transparency settings can be re-applied to all avatars without
 * regenerating.
 */
@singleton()
export class AvatarService {
  private readonly handlers: AvatarHandler[] = []
  private readonly removedHandlers: AvatarRemovedHandler[] = []
  /** characterId → the avatar currently displayed for it. */
  private readonly active = new Map<string, ActiveAvatar>()

  constructor(
    private readonly sim: SimManager,
    private readonly imageGen: ImageGenerationService,
    private readonly saveData: SaveDataService,
    private readonly config: ComfyConfigStore
  ) {
    this.sim.onImageRequest((request) => {
      if (request.type === 'avatar') void this.handle(request)
    })
  }

  /** Subscribe to generated avatar events. */
  onAvatar(handler: AvatarHandler): void {
    this.handlers.push(handler)
  }

  /** Subscribe to avatar-removed events (an NPC deactivated and should no longer
   *  be shown on the chat page). */
  onAvatarRemoved(handler: AvatarRemovedHandler): void {
    this.removedHandlers.push(handler)
  }

  /** Drop a single character's avatar (e.g. the NPC left the player's location).
   *  Clears it from the active set so it isn't replayed to a remounting page,
   *  and notifies subscribers (the IPC layer → renderer). */
  remove(characterId: string): void {
    if (!this.active.delete(characterId)) return
    for (const handler of this.removedHandlers) handler(characterId)
  }

  /** Re-apply the current transparency settings to every active avatar and
   *  re-emit them — no regeneration. */
  async recalculateAll(): Promise<void> {
    const settings = await this.config.getImgGenSettings()
    for (const avatar of this.active.values()) {
      await this.emit(avatar, settings)
    }
  }

  private originalRel(characterId: string, hash: string): string {
    return `img_gen/generated/characters/${characterId}/${hash}.png`
  }

  /** Where the most recent prompt for a character is stored (alongside its
   *  images), so a "regen" can re-roll the exact prompt that produced the
   *  currently displayed avatar. */
  private promptRel(characterId: string): string {
    return `img_gen/generated/characters/${characterId}/prompt.json`
  }

  private cacheBuster = () => { return Date.now() }
  private transRel(characterId: string, hash: string): string {
    return `img_gen/generated/characters/${characterId}/trans_${hash}_${this.cacheBuster()}.png`
  }

  /** Snapshot of the currently displayed avatars, for replay to a chat page that
   *  mounts after they were emitted (e.g. cache hits at scenario start). */
  getActive(): AvatarGeneratedEvent[] {
    const events: AvatarGeneratedEvent[] = []
    for (const avatar of this.active.values()) {
      if (avatar.url) events.push({ characterId: avatar.characterId, url: avatar.url })
    }
    return events
  }

  /** Forget all active avatars (e.g. when a new scenario starts). */
  clear(): void {
    this.active.clear()
  }

  /**
   * Resolve, cache, and emit an avatar for a prompt. When `force` is true the
   * disk cache is bypassed and a fresh image is generated with a random seed
   * (used by {@link regenerate} to re-roll an image).
   */
  async handle(request: PromptRequest, force = false): Promise<void> {
    try {
      const characterId = request.characterId
      if (!characterId) {
        console.warn('[avatar] got avatar request with no characterId')
        return
      }
      const hash = promptHash(request.positive, request.negative)
      const originalRel = this.originalRel(characterId, hash)
      const settings = await this.config.getImgGenSettings()

      // Remember the raw (pre-transparency) prompt so it can be re-rolled later.
      await this.saveData.write(this.promptRel(characterId), JSON.stringify(request))

      // Cache check is always against the unedited original; `force` re-generates.
      if (force || !(await this.saveData.exists(originalRel))) {
        if (!settings.enabled) return // generation off and nothing cached → skip
        const genRequest: PromptRequest = settings.transparencyEnabled
          ? {
            ...request,
            positive: appendPrompt(request.positive, settings.transparencyPositivePrompt),
            negative: appendPrompt(request.negative, settings.transparencyNegativePrompt)
          }
          : request
        const image = await this.imageGen.generate(
          genRequest,
          force ? { forceRandomSeed: true } : undefined
        )
        await this.saveData.writeBytes(originalRel, image.bytes)
      }

      const avatar: ActiveAvatar = { characterId, hash }
      this.active.set(characterId, avatar)
      await this.emit(avatar, settings)
    } catch (err) {
      console.error('[avatar] failed to handle avatar request:', err)
    }
  }

  /** Re-roll the avatar for a character: re-generate (random seed) from the
   *  stored prompt that produced the current image, falling back to the live
   *  sim for avatars generated before prompts were persisted. */
  async regenerate(characterId: string): Promise<void> {
    const request = await this.loadPrompt(characterId)
    if (!request) {
      console.warn('[avatar] no prompt available to regenerate', characterId)
      return
    }
    await this.handle(request, true)
  }

  /** The prompt that produced the current avatar: the stored one, or a freshly
   *  built one from the live sim as a fallback. */
  private async loadPrompt(characterId: string): Promise<PromptRequest | null> {
    const stored = await this.saveData.read(this.promptRel(characterId))
    if (stored) {
      try {
        return JSON.parse(stored) as PromptRequest
      } catch {
        // fall through to the sim fallback below
      }
    }
    return (await this.sim.getSim()?.getAvatarPromptForCharacter(characterId)) ?? null
  }

  /** Build the displayed image (transparency-applied if enabled) and emit it. */
  private async emit(avatar: ActiveAvatar, settings: ImgGenSettings): Promise<void> {
    try {
      const { characterId, hash } = avatar
      const originalRel = this.originalRel(characterId, hash)

      let rel = originalRel
      let url: string
      if (settings.transparencyEnabled) {
        const original = await this.saveData.readBytes(originalRel)
        if (!original) return
        const edited = await applyTransparency(original, settings)
        rel = this.transRel(characterId, hash)
        await this.saveData.writeBytes(rel, edited)
        // The transparency filename is already unique per emit (cache-busts itself).
        url = toImageUrl(this.saveData.resolveWithin(rel))
      } else {
        // The original filename is stable, so a regen overwrites the same path —
        // bust the URL so the renderer reloads instead of showing the cached image.
        url = `${toImageUrl(this.saveData.resolveWithin(rel))}?v=${this.cacheBuster()}`
      }

      avatar.url = url // remember for replay / snapshot
      for (const handler of this.handlers) handler({ characterId, url })
    } catch (err) {
      console.error('[avatar] failed to emit avatar:', err)
    }
  }
}
