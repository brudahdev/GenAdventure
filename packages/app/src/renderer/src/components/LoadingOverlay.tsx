import { onMount, onCleanup, Show } from 'solid-js'
import { overlayVisible, setOverlayVisible, overlayText, setOverlayText } from '../stores/overlay-store'
import { sceneFading, sceneBlack } from '../stores/transition-store'

export default function LoadingOverlay() {
  onMount(() => {
    const unsubShow = window.electronAPI.overlay.onShow((text) => {
      setOverlayText(text)
      setOverlayVisible(true)
    })
    const unsubHide = window.electronAPI.overlay.onHide(() => {
      setOverlayVisible(false)
      setOverlayText(null)
    })
    onCleanup(() => {
      unsubShow()
      unsubHide()
    })
  })

  // During a scene-change transition, hold the spinner until the screen is solid
  // black (so it never flashes over a partially-faded scene). With no transition in
  // progress this is inert and the overlay shows immediately.
  return (
    <Show when={overlayVisible() && (!sceneFading() || sceneBlack())}>
      <div class="loading-overlay">
        <div class="loading-spinner" />
        <Show when={overlayText()}>
          <span class="loading-text">{overlayText()}</span>
        </Show>
      </div>
    </Show>
  )
}
