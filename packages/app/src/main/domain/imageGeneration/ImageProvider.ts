import type { PromptRequest } from '@gen-adventure/shared'

/** Raw image bytes plus the file extension to write them as (no leading dot). */
export interface ImageBytes {
  bytes: Buffer
  ext: string
}

/** Callbacks an {@link ImageProvider} invokes while a generation is in flight. */
export interface GenerateCallbacks {
  /** A preview frame produced mid-generation (only when previews are enabled). */
  onPreview(image: ImageBytes): void
}

/**
 * A backend that turns a {@link PromptRequest} into an image. ComfyUI is the first
 * implementation; the abstraction lets other providers be added later.
 * `ImageGenerationService` owns queueing, temp files, and IPC — providers only
 * generate.
 */
export interface ImageProvider {
  generate(request: PromptRequest, callbacks: GenerateCallbacks): Promise<ImageBytes>
}

/** DI token for the bound {@link ImageProvider} implementation. */
export const IMAGE_PROVIDER = Symbol('ImageProvider')
