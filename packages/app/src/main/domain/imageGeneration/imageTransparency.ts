import sharp from 'sharp'
import type { ImgGenSettings } from '@gen-adventure/shared'

/**
 * Chroma-key transparency post-processing for generated avatars. Pixels close to
 * the configured background color (by Manhattan RGB distance) have their alpha
 * feathered toward fully transparent, while RGB is preserved. Returns a PNG buffer
 * (alpha-capable). On any failure the original bytes are returned unchanged so the
 * generation pipeline never breaks.
 */

/** Parse a `#RRGGBB` (or `#RGB`) hex string into RGB components. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace(/^#/, '').trim()
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h, 16)
  if (h.length !== 6 || Number.isNaN(n)) return { r: 255, g: 0, b: 255 }
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}

export async function applyTransparency(
  input: Buffer,
  settings: ImgGenSettings
): Promise<Buffer> {
  try {
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { r: bgR, g: bgG, b: bgB } = hexToRgb(settings.transparencyBackgroundColor)
    const outer = settings.transparencySimilarity
    const inner = outer * (1 - settings.transparencyEdgeSoftness)
    const band = outer - inner

    // RGBA, 4 bytes per pixel. Modify only the alpha channel.
    for (let i = 0; i < data.length; i += 4) {
      const d =
        Math.abs(data[i] - bgR) + Math.abs(data[i + 1] - bgG) + Math.abs(data[i + 2] - bgB)

      if (d === 0) {
        data[i + 3] = 0 // exact match → fully transparent
      } else if (d >= outer) {
        // outside threshold → leave alpha untouched
      } else if (d <= inner) {
        data[i + 3] = 0 // inside core band → transparent
      } else {
        data[i + 3] = Math.round(data[i + 3] * (d - inner) / band) // feathered ramp
      }
    }

    return await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 }
    })
      .png()
      .toBuffer()
  } catch (err) {
    console.error('[image-gen] transparency processing failed:', err)
    return input
  }
}
