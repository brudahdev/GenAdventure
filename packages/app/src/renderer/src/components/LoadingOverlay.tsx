import { onMount, onCleanup, Show } from 'solid-js'
import { overlayVisible, setOverlayVisible, overlayText, setOverlayText } from '../stores/overlay-store'

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

  return (
    <Show when={overlayVisible()}>
      <div class="loading-overlay">
        <div class="loading-spinner" />
        <Show when={overlayText()}>
          <span class="loading-text">{overlayText()}</span>
        </Show>
      </div>
    </Show>
  )
}
