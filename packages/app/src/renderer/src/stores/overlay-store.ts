import { createSignal } from 'solid-js'

export const [overlayVisible, setOverlayVisible] = createSignal(false)
export const [overlayText, setOverlayText] = createSignal<string | null>(null)
