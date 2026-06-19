import { createSignal } from 'solid-js'

/**
 * Scene-change transition state, shared between the ChatPage (which owns the
 * `.chat-transition` fade element) and the global LoadingOverlay (which gates its
 * spinner on solid black).
 *
 * `sceneFading` is true for the whole transition (between the fade-to-black show and
 * the fade-out hide). `sceneBlack` flips true only once the fade-in has fully
 * completed (the element's opacity `transitionend`), so consumers can wait for the
 * screen to be *actually* black rather than approximating with a timer.
 */
export const [sceneFading, setSceneFading] = createSignal(false)
export const [sceneBlack, setSceneBlack] = createSignal(false)
