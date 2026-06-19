import { MIN_PIXELS, MAX_PIXELS, type PromptRequest } from '@gen-adventure/shared'

/** Round to the nearest positive multiple of 64 (never below 64). */
function roundTo64(value: number): number {
  return Math.max(64, Math.round(value / 64) * 64)
}

/**
 * Translate an aspect ratio + total-pixel budget into concrete `width`/`height`,
 * each rounded to a multiple of 64. The budget is clamped to [MIN_PIXELS,
 * MAX_PIXELS] first, then scaled to preserve the requested ratio.
 */
export function toWidthHeight(
  aspect: PromptRequest['aspectRatio'],
  targetPixels: number
): { width: number; height: number } {
  const ratioW = aspect.width > 0 ? aspect.width : 1
  const ratioH = aspect.height > 0 ? aspect.height : 1

  const budget = Math.min(MAX_PIXELS, Math.max(MIN_PIXELS, targetPixels))
  const scale = Math.sqrt(budget / (ratioW * ratioH))

  return {
    width: roundTo64(ratioW * scale),
    height: roundTo64(ratioH * scale)
  }
}
