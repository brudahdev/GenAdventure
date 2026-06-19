import type { JSX } from 'solid-js'

interface SearchBarProps {
  value: string
  onInput: (value: string) => void
  placeholder?: string
}

/** A controlled single-line search/filter input. */
export default function SearchBar(props: SearchBarProps): JSX.Element {
  return (
    <input
      class="field-input search-bar"
      type="text"
      value={props.value}
      placeholder={props.placeholder ?? 'Search…'}
      onInput={(e) => props.onInput(e.currentTarget.value)}
    />
  )
}
