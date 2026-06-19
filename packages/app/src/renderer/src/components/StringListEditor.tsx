import { createSignal, For } from 'solid-js'
import type { JSX } from 'solid-js'

/**
 * A reusable free-string add/remove list (e.g. for tags / excludeTags).
 * Trimmed, non-empty, non-duplicate values are appended via the input + Add button.
 */
export default function StringListEditor(props: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}): JSX.Element {
  const [draft, setDraft] = createSignal('')

  const add = (): void => {
    const val = draft().trim()
    if (!val || props.values.includes(val)) {
      setDraft('')
      return
    }
    props.onChange([...props.values, val])
    setDraft('')
  }

  const remove = (idx: number): void => {
    props.onChange(props.values.filter((_, i) => i !== idx))
  }

  return (
    <div class="field">
      <label class="field-label">{props.label}</label>
      <For each={props.values}>
        {(value, i) => (
          <div class="list-toolbar">
            <span class="list-row-name" style={{ flex: '1' }}>
              {value}
            </span>
            <button class="btn" onClick={() => remove(i())}>
              Remove
            </button>
          </div>
        )}
      </For>
      <div class="list-toolbar">
        <input
          class="field-input"
          style={{ flex: '1' }}
          type="text"
          placeholder={props.placeholder ?? 'Add value…'}
          value={draft()}
          onInput={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button class="btn btn-primary" onClick={add}>
          Add
        </button>
      </div>
    </div>
  )
}
