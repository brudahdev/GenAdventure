import type { JSX } from 'solid-js'

interface ConfirmModalProps {
  title: string
  message: string
  /** Label for the confirming (proceed) button. */
  confirmLabel: string
  /** Whether the confirm button should use the danger (red) style. */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A small reusable confirmation popup (Cancel + a single confirming action).
 * Used for the quit warning and the overwrite-save warning.
 */
export default function ConfirmModal(props: ConfirmModalProps): JSX.Element {
  return (
    <div class="modal-overlay" onClick={() => props.onCancel()}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{props.title}</h2>
        <p class="confirm-message">{props.message}</p>
        <div class="modal-actions">
          <button class="btn" onClick={() => props.onCancel()}>
            Cancel
          </button>
          <button
            class="btn"
            classList={{ 'btn-danger': props.danger, 'btn-primary': !props.danger }}
            onClick={() => props.onConfirm()}
          >
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
