import { createSignal, Show } from 'solid-js'
import type { JSX } from 'solid-js'

interface CollapsibleSectionProps {
  title: string
  /** Whether the section starts expanded. Defaults to collapsed. */
  defaultOpen?: boolean
  children: JSX.Element
}

/** A titled section whose body can be toggled open/closed by clicking the header. */
export default function CollapsibleSection(props: CollapsibleSectionProps): JSX.Element {
  const [open, setOpen] = createSignal(props.defaultOpen ?? false)

  return (
    <div class="collapsible">
      <button class="collapsible-header" onClick={() => setOpen((v) => !v)}>
        <span class="collapsible-caret">{open() ? '▾' : '▸'}</span>
        <span class="collapsible-title">{props.title}</span>
      </button>
      <Show when={open()}>
        <div class="collapsible-body">{props.children}</div>
      </Show>
    </div>
  )
}
