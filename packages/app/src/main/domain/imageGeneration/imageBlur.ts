import sharp from 'sharp'
import type { ImgGenSettings } from '@gen-adventure/shared'

/**
 * Gaussian-blur post-processing for generated backgrounds. The blur strength is
 * driven by `settings.blurAmount` (sharp sigma). Returns a PNG buffer. On any
 * failure the original bytes are returned unchanged so the generation pipeline
 * never breaks.
 */
export async function applyBlur(input: Buffer, settings: ImgGenSettings): Promise<Buffer> {
  try {
    const sigma = settings.blurAmount
    if (!(sigma > 0)) return input // 0/invalid → no-op
    // sharp throws for sigma < 0.3, so clamp the lower bound.
    return await sharp(input).blur(Math.max(0.3, sigma)).png().toBuffer()
  } catch (err) {
    console.error('[image-gen] blur processing failed:', err)
    return input
  }
}
