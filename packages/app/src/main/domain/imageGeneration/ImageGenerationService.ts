import { inject, singleton } from 'tsyringe'
import type { PromptRequest } from '@gen-adventure/shared'
import {
  IMAGE_PROVIDER,
  type GenerateOptions,
  type ImageBytes,
  type ImageProvider
} from './ImageProvider'

interface QueueEntry {
  request: PromptRequest
  options?: GenerateOptions
  resolve: (image: ImageBytes) => void
  reject: (err: unknown) => void
}

/**
 * Thin generation engine: turns a {@link PromptRequest} into image bytes by
 * delegating to the configured {@link ImageProvider} (ComfyUI being the first
 * implementation), one request at a time (FIFO queue) so the single shared
 * backend is never hit concurrently.
 *
 * It has no knowledge of the sim, the renderer, caching, or transparency — those
 * are owned by `AvatarService` / `BackgroundService`. Mid-generation previews are
 * ignored here (the provider still supports them internally).
 */
@singleton()
export class ImageGenerationService {
  private readonly queue: QueueEntry[] = []
  private processing = false

  constructor(@inject(IMAGE_PROVIDER) private readonly provider: ImageProvider) {}

  /** Generate one image. Resolves with the final bytes once this request's turn
   *  in the queue completes. */
  generate(request: PromptRequest, options?: GenerateOptions): Promise<ImageBytes> {
    return new Promise<ImageBytes>((resolve, reject) => {
      this.queue.push({ request, options, resolve, reject })
      void this.drain()
    })
  }

  /** Process the queue one request at a time. */
  private async drain(): Promise<void> {
    if (this.processing) return
    this.processing = true
    try {
      while (this.queue.length > 0) {
        const entry = this.queue.shift()!
        try {
          const image = await this.provider.generate(
            entry.request,
            { onPreview: () => {} },
            entry.options
          )
          entry.resolve(image)
        } catch (err) {
          entry.reject(err)
        }
      }
    } finally {
      this.processing = false
    }
  }
}
