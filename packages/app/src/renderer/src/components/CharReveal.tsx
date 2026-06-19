import { For, createMemo } from 'solid-js'
import type { JSX } from 'solid-js'

/**
 * How long each character takes to fade from opacity 0 → 1 (ms). Single source of
 * truth — also fed to CSS via the `--char-fade-ms` variable on `.chat-messages`.
 * Tweak here to change the per-character ramp speed.
 */
export const CHAR_FADE_MS = 50

interface CharRevealProps {
  /** The chunk text to reveal character-by-character. */
  text: string
  /** Audio clip length (ms) the reveal is paced over. */
  duration: number
}

/**
 * Renders a chunk's characters as individual spans that fade in one at a time,
 * paced by the audio clip length: character `i` (of `n`) starts fading at
 * `(i+1)/n * (duration - CHAR_FADE_MS)`, so the last character finishes its fade
 * right as the clip ends (no snap when the chunk folds into the static text).
 * Each span fades via the `.chat-char` CSS animation; only the per-char delay is
 * inline (data-driven). The memo keeps the array stable while `text`/`duration`
 * are unchanged, so spans don't re-mount mid-animation.
 */
export default function CharReveal(props: CharRevealProps): JSX.Element {
  const chars = createMemo(() => {
    const text = props.text
    const n = text.length
    // Shift the window earlier by the ramp so fades complete by the clip's end.
    const span = Math.max(0, props.duration - CHAR_FADE_MS)
    return Array.from(text, (ch, i) => ({
      ch,
      delay: n > 0 ? Math.round(((i + 1) / n) * span) : 0
    }))
  })

  return (
    <For each={chars()}>
      {(c) => (
        <span class="chat-char" style={`--char-delay:${c.delay}ms`}>
          {c.ch}
        </span>
      )}
    </For>
  )
}
