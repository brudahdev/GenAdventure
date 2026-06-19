import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import ImageConfigForm from './ImageConfigForm'

interface ImageConfigModalProps {
  /** Called to close the popup. */
  onClose: () => void
}

/**
 * Landing-page popup wrapper around the shared {@link ImageConfigForm}. Adds the
 * "ComfyUI Config" navigation (which leaves to a route, so it lives here rather
 * than in the chat-page dropdown).
 */
export default function ImageConfigModal(props: ImageConfigModalProps): JSX.Element {
  const navigate = useNavigate()

  return (
    <div class="modal-overlay" onClick={() => props.onClose()}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Image Config</h2>

        <ImageConfigForm
          onOpenComfyConfig={() => {
            props.onClose()
            navigate('/config/comfyui')
          }}
        />

        <div class="modal-actions">
          <button class="btn btn-primary" onClick={() => props.onClose()}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
