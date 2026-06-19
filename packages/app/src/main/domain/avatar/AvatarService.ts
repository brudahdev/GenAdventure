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

  async handle(request: PromptRequest): Promise<void> {
    try {
      const characterId = request.characterId
      if (!characterId) {
        console.warn('[avatar] got avatar request with no characterId')
        return
      }
      const hash = promptHash(request.positive, request.negative)
      const originalRel = this.originalRel(characterId, hash)
      const settings = await this.config.getImgGenSettings()

      // Cache check is always against the unedited original.
      if (!(await this.saveData.exists(originalRel))) {
        if (!settings.enabled) return // generation off and nothing cached → skip
        const genRequest: PromptRequest = settings.transparencyEnabled
          ? {
            ...request,
            positive: appendPrompt(request.positive, settings.transparencyPositivePrompt),
            negative: appendPrompt(request.negative, settings.transparencyNegativePrompt)
          }
          : request
        const image = await this.imageGen.generate(genRequest)
        await this.saveData.writeBytes(originalRel, image.bytes)
      }

      const avatar: ActiveAvatar = { characterId, hash }
      this.active.set(characterId, avatar)
      await this.emit(avatar, settings)
    } catch (err) {
      console.error('[avatar] failed to handle avatar request:', err)
    }
  }

  /** Build the displayed image (transparency-applied if enabled) and emit it. */
  private async emit(avatar: ActiveAvatar, settings: ImgGenSettings): Promise<void> {
    try {
      const { characterId, hash } = avatar
      const originalRel = this.originalRel(characterId, hash)

      let rel = originalRel
      if (settings.transparencyEnabled) {
        const original = await this.saveData.readBytes(originalRel)
        if (!original) return
        const edited = await applyTransparency(original, settings)
        rel = this.transRel(characterId, hash)
        await this.saveData.writeBytes(rel, edited)
      }

      const url = toImageUrl(this.saveData.resolveWithin(rel))
      avatar.url = url // remember for replay / snapshot
      for (const handler of this.handlers) handler({ characterId, url })
    } catch (err) {
      console.error('[avatar] failed to emit avatar:', err)
    }
  }
}
