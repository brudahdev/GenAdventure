import { createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'

/**
 * Generated images shown on the Chat page, each a `genimg://` URL.
 *
 * `avatars` holds one entry per character, keyed by `characterId` — the chat page
 * renders one avatar per entry. Updating an existing character's `src` in place
 * keeps its row (and DOM node) so the avatar cross-fades; a new `characterId` is
 * prepended so a fresh avatar slides in on the left (and existing ones glide
 * right). `backgroundImage` fills the page behind everything.
 *
 * Relayout/animation timing is owned by the chat page (it measures the avatars
 * around each mutation for a correct FLIP); these mutators only touch state.
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

/** Upsert an avatar by characterId: update in place (cross-fade) or prepend so a
 *  new avatar slides in on the left. `fadeIn` drives whether the new avatar
 *  animates in (vs. appears instantly under the scene fade). */
export function setAvatar(characterId: string, src: string, fadeIn: boolean): void {
  setAvatars(
    produce((list) => {
      const existing = list.find((a) => a.characterId === characterId)
      if (existing) existing.src = src
      else list.unshift({ characterId, src, fadeIn })
    })
  )
}

/** Mark an avatar as leaving so it plays its CSS fade-out animation. The chat
 *  page splices it (via {@link spliceAvatar}) once the fade finishes. */
export function markAvatarExiting(characterId: string): void {
  setAvatars(
    produce((list) => {
      const exiting = list.find((a) => a.characterId === characterId)
      if (exiting) exiting.exiting = true
    })
  )
}

/** Remove a single character's avatar entry. */
export function spliceAvatar(characterId: string): void {
  setAvatars(
    produce((list) => {
      const i = list.findIndex((a) => a.characterId === characterId)
      if (i !== -1) list.splice(i, 1)
    })
  )
}

/** Remove all avatars (e.g. when (re)entering a chat). */
export function clearAvatars(): void {
  setAvatars([])
}

export const [backgroundImage, setBackgroundImage] = createSignal<string | null>(null)
