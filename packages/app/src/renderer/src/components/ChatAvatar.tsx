import type { JSX } from 'solid-js'
import { speakingCharacterId } from '../stores/audio-store'

/** Duration (ms) of the avatar enter/exit slide-fade. Must match
 *  `--avatar-transition-duration` in components.css so the store's delayed
 *  removal lines up with the CSS exit animation. */
export const AVATAR_FADE_MS = 450
/** Target scale (%) of the avatar while its character is speaking (110 = +10%). */
export const AVATAR_SPEAKING_SIZE_PERCENT = 110
/** Time (ms) to smoothly lerp the avatar to/from its speaking size. */
export const AVATAR_SPEAKING_SIZE_TIME = 300
/** Brightness reduction applied to non-speaking avatars (0.35 → brightness 0.65). */
export const NON_SPEAKING_AVATAR_DARKEN_AMOUNT = 0.35
/** Time (ms) to smoothly lerp the non-speaking darken in/out. */
export const NON_SPEAKING_AVATAR_DARKEN_TIME = 300

interface ChatAvatarProps {
  characterId: string
  src: string
  /** Slide + fade the avatar in on mount (the NPC moved). When false it appears
   *  instantly (the player moved, shown under the scene fade-to-black). */
  fadeIn?: boolean
  /** Marks the avatar as leaving: plays the fade-out animation before the chat
   *  page removes it from the store. */
  exiting?: boolean
  /** Forwards the wrapper element to the parent (used for FLIP relayout). */
  ref?: (el: HTMLDivElement) => void
  /** Right-click handler — opens the per-character action context menu. */
  onContextMenu?: (characterId: string, x: number, y: number) => void
}

/**
 * A single character's avatar. Renders a stable wrapper (the flex item the chat
 * page positions and animates) containing one image. When `src` changes the
 * image swaps instantly — no cross-fade, no slide. The wrapper slide-fades in on
 * mount when `fadeIn` is set and fades out when `exiting` is set.
 */
export default function ChatAvatar(props: ChatAvatarProps): JSX.Element {
  // Speaking emphasis: grow this avatar while its character speaks; darken it
  // while a *different* character is speaking. CSS interpolates both over time.
  const speaking = (): boolean => speakingCharacterId() === props.characterId
  const someoneElseSpeaking = (): boolean =>
    speakingCharacterId() != null && !speaking()
  const scale = (): number => (speaking() ? AVATAR_SPEAKING_SIZE_PERCENT / 100 : 1)
  const brightness = (): number =>
    someoneElseSpeaking() ? 1 - NON_SPEAKING_AVATAR_DARKEN_AMOUNT : 1

  return (
    <div
      class="chat-avatar"
      classList={{ 'is-fade-in': props.fadeIn, 'is-exiting': props.exiting }}
      ref={props.ref}
      onContextMenu={(e) => {
        if (!props.onContextMenu) return
        if (!(e.target instanceof HTMLImageElement)) return
        e.preventDefault()
        props.onContextMenu(props.characterId, e.clientX, e.clientY)
      }}
      style={{
        '--avatar-scale': String(scale()),
        '--avatar-brightness': String(brightness()),
        '--avatar-speaking-time': `${AVATAR_SPEAKING_SIZE_TIME}ms`,
        '--avatar-darken-time': `${NON_SPEAKING_AVATAR_DARKEN_TIME}ms`
      }}
    >
      <img class="chat-avatar-img" src={props.src} alt="Generated avatar" />
    </div>
  )
}
