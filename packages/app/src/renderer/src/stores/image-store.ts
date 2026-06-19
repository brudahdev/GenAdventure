import { createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { AVATAR_FADE_MS } from '../components/ChatAvatar'

/**
 * Generated images shown on the Chat page, each a `genimg://` URL.
 *
 * `avatars` holds one entry per character, keyed by `characterId` — the chat page
 * renders one avatar per entry. Updating an existing character's `src` in place
 * keeps its row (and DOM node) so the avatar cross-fades; a new `characterId` is
 * prepended so a fresh avatar slides in on the left (and existing ones glide
 * right). `backgroundImage` fills the page behind everything.
 */
export interface AvatarEntry {
  characterId: string
  src: string
  /** Slide + fade this avatar in on mount (the NPC moved) vs. appear instantly
   *  (the player moved, shown under the scene fade-to-black). */
  fadeIn: boolean
  /** Set while the avatar plays its fade-out animation before being spliced. */
  exiting?: boolean
}

export const [avatars, setAvatars] = createStore<AvatarEntry[]>([])

/** Whether the most recent add/remove should animate the *other* avatars'
 *  relayout (FLIP). Mirrors the op's `useFade` so a player-move (instant, under
 *  the scene fade) snaps survivors into place instead of gliding them. */
export const [avatarRelayoutFade, setAvatarRelayoutFade] = createSignal(true)

/** Upsert an avatar by characterId: update in place (cross-fade) or prepend so a
 *  new avatar slides in on the left. `useFade` drives whether the new avatar
 *  animates in and whether existing avatars glide to their new positions. */
export function setAvatar(characterId: string, src: string, useFade: boolean): void {
  setAvatarRelayoutFade(useFade)
  setAvatars(
    produce((list) => {
      const existing = list.find((a) => a.characterId === characterId)
      if (existing) existing.src = src
      else list.unshift({ characterId, src, fadeIn: useFade })
    })
  )
}

/** Remove a single character's avatar (e.g. the NPC left the player's location).
 *  When `useFade`, mark it exiting and splice after the fade-out finishes;
 *  otherwise splice immediately. */
export function removeAvatar(characterId: string, useFade: boolean): void {
  setAvatarRelayoutFade(useFade)
  if (!useFade) {
    setAvatars(
      produce((list) => {
        const i = list.findIndex((a) => a.characterId === characterId)
        if (i !== -1) list.splice(i, 1)
      })
    )
    return
  }
  setAvatars(
    produce((list) => {
      const exiting = list.find((a) => a.characterId === characterId)
      if (exiting) exiting.exiting = true
    })
  )
  setTimeout(() => {
    setAvatars(
      produce((list) => {
        const i = list.findIndex((a) => a.characterId === characterId)
        if (i !== -1) list.splice(i, 1)
      })
    )
  }, AVATAR_FADE_MS)
}

/** Remove all avatars (e.g. when (re)entering a chat). */
export function clearAvatars(): void {
  setAvatars([])
}

export const [backgroundImage, setBackgroundImage] = createSignal<string | null>(null)
