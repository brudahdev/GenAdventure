import { inject, singleton } from 'tsyringe'
import type { PromptRequest } from '@gen-adventure/shared'
import {
  IMAGE_PROVIDER,
  type GenerateOptions,
  type ImageBytes,
  type ImageProvider
} from './ImageProvider'
import { OverlayService } from '../overlay/OverlayService'

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
 * It owns the loading overlay *for actual generation*: each request may carry a
 * `label`, shown while that request is processing; the text transitions per item
 * and the overlay hides when the queue drains. Requests without a label (and cache
 * hits, which never reach here) show no overlay. Mid-generation previews are
 * ignored here (the provider still supports them internally).
 */
@singleton()
export class ImageGenerationService {
  private readonly queue: QueueEntry[] = []
  private processing = false
  /** Whether the loading overlay is currently held by this service. */
  private overlayShown = false

  constructor(
    @inject(IMAGE_PROVIDER) private readonly provider: ImageProvider,
    private readonly overlay: OverlayService
  ) {}

  /** Generate one image. Resolves with the final bytes once this request's turn
   *  in the queue completes. */
  generate(request: PromptRequest, options?: GenerateOptions): Promise<ImageBytes> {
    return new Promise<ImageBytes>((resolve, reject) => {
      this.queue.push({ request, options, resolve, reject })
      void this.drain()
    })
  }

  /** Process the queue one request at a time, driving the loading overlay text per
   *  item and hiding it once the queue is empty. */
  private async drain(): Promise<void> {
    if (this.processing) return
    this.processing = true
    try {
      while (this.queue.length > 0) {
        const entry = this.queue.shift()!
        if (entry.options?.label) {
          this.overlay.show(entry.options.label)
          this.overlayShown = true
        }
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
      if (this.overlayShown) {
        this.overlay.hide()
        this.overlayShown = false
      }
    }
  }
}
