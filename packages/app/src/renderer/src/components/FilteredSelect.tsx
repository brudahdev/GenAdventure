import { createMemo, createSignal, For, Show } from 'solid-js'
import type { JSX } from 'solid-js'

/** A searchable dropdown for referencing IDs from a known set of options. */
export default function FilteredSelect(props: {
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  invalid?: boolean
  errorMessage?: string
}): JSX.Element {
  const [search, setSearch] = createSignal('')
  const filtered = createMemo(() => {
    const q = search().toLowerCase()
    return q ? props.options.filter((o) => o.toLowerCase().includes(q)) : props.options
  })

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
      <input
        class="field-input"
        type="text"
        placeholder={props.placeholder ?? 'Filter…'}
        value={search()}
        onInput={(e) => setSearch(e.currentTarget.value)}
      />
      <select
        class="field-input"
        classList={{ 'field-invalid': !!props.invalid }}
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
      >
        <option value="">— select —</option>
        <Show when={props.value && !filtered().includes(props.value)}>
          <option value={props.value}>{props.value}</option>
        </Show>
        <For each={filtered()}>{(o) => <option value={o}>{o}</option>}</For>
      </select>
      <Show when={props.errorMessage}>
        <span class="field-error">{props.errorMessage}</span>
      </Show>
    </div>
  )
}
