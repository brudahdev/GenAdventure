import { createSignal, For } from 'solid-js'
import type { JSX } from 'solid-js'
import FilteredSelect from './FilteredSelect'

/** Pick several foreign-id references from a known set of options. */
export default function MultiRefSelect(props: {
  values: string[]
  options: string[]
  optionSet: Set<string>
  onChange: (next: string[]) => void
  placeholder?: string
}): JSX.Element {
  const [draft, setDraft] = createSignal('')

  const add = (): void => {
    const val = draft()
    if (!val || props.values.includes(val)) return
    props.onChange([...props.values, val])
    setDraft('')
  }

  return (
    <>
      <For each={props.values}>
        {(value, i) => (
          <div class="list-toolbar">
            <div style={{ flex: '1' }}>
              <FilteredSelect
                options={props.options}
                value={value}
                onChange={(v) => props.onChange(props.values.map((x, k) => (k === i() ? v : x)))}
                placeholder={props.placeholder}
                invalid={!!value && !props.optionSet.has(value)}
                errorMessage={!!value && !props.optionSet.has(value) ? 'Not found' : undefined}
              />
            </div>
            <button class="btn" onClick={() => props.onChange(props.values.filter((_, k) => k !== i()))}>
              Remove
            </button>
          </div>
        )}
      </For>
      <div class="list-toolbar">
        <div style={{ flex: '1' }}>
          <FilteredSelect
            options={props.options}
            value={draft()}
            onChange={setDraft}
            placeholder={props.placeholder ?? 'Select to add…'}
          />
        </div>
        <button class="btn btn-primary" onClick={add}>
          Add
        </button>
      </div>
    </>
  )
}
