import { For } from 'solid-js'
import type { JSX } from 'solid-js'
import type { ValidationError } from '../lib/characterConfigForm'

/** Modal listing validation errors that block a save. Shared by the character and
 *  player config editors. */
export default function ErrorListModal(props: {
  errors: ValidationError[]
  onClose: () => void
}): JSX.Element {
  return (
    <div class="modal-overlay" onClick={() => props.onClose()}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Cannot save — {props.errors.length} issue(s)</h2>
        <div
          style={{
            'max-height': '50vh',
            'overflow-y': 'auto',
            display: 'flex',
            'flex-direction': 'column',
            gap: '8px'
          }}
        >
          <For each={props.errors}>
            {(err) => (
              <div class="list-row">
                <div class="list-row-info">
                  <span class="field-error" style={{ 'margin-top': '0' }}>
                    {err.message}
                  </span>
                </div>
              </div>
            )}
          </For>
        </div>
        <div class="modal-actions">
          <button class="btn" onClick={() => props.onClose()}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
