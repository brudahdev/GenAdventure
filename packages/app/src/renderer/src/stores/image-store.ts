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
 */
export interface AvatarEntry {
  characterId: string
  src: string
}

export const [avatars, setAvatars] = createStore<AvatarEntry[]>([])

/** Upsert an avatar by characterId: update in place (cross-fade) or prepend so a
 *  new avatar slides in on the left. */
export function setAvatar(characterId: string, src: string): void {
  setAvatars(
    produce((list) => {
      const existing = list.find((a) => a.characterId === characterId)
      if (existing) existing.src = src
      else list.unshift({ characterId, src })
    })
  )
}

/** Remove all avatars (e.g. when (re)entering a chat). */
export function clearAvatars(): void {
  setAvatars([])
}

export const [backgroundImage, setBackgroundImage] = createSignal<string | null>(null)
