import { createSignal, onMount } from 'solid-js'
import type { JSX } from 'solid-js'

interface VoxtaConfigModalProps {
  /** Called after the config is saved, to close the popup. */
  onClose: () => void
}

/**
 * Popup form for Voxta connection settings. Prefills the URL from main; the API
 * key field starts empty because the secret never leaves the main process —
 * leaving it empty on save keeps the existing key.
 */
export default function VoxtaConfigModal(props: VoxtaConfigModalProps): JSX.Element {
  const [url, setUrl] = createSignal('')
  const [apiKey, setApiKey] = createSignal('')
  const [hasApiKey, setHasApiKey] = createSignal(false)

  onMount(async () => {
    const cfg = await window.electronAPI.voxtaConfig.get()
    setUrl(cfg.url)
    setHasApiKey(cfg.hasApiKey)
  })

  const saveAndClose = async () => {
    await window.electronAPI.voxtaConfig.set({ url: url(), apiKey: apiKey() })
    props.onClose()
  }

  return (
    <div class="modal-overlay" onClick={() => props.onClose()}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Voxta Config</h2>

        <div class="field">
          <label class="field-label">VOXTA URL</label>
          <input
            class="field-input"
            type="text"
            value={url()}
            onInput={(e) => setUrl(e.currentTarget.value)}
          />
        </div>

        <div class="field">
          <label class="field-label">VOXTA API KEY</label>
          <input
            class="field-input"
            type="text"
            value={apiKey()}
            placeholder={
              hasApiKey()
                ? 'A key is saved — leave empty to keep it'
                : 'Leave empty if no password set'
            }
            onInput={(e) => setApiKey(e.currentTarget.value)}
          />
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary" onClick={saveAndClose}>
            Save & Close
          </button>
        </div>
      </div>
    </div>
  )
}
