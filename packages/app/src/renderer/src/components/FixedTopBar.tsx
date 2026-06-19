import { Show } from 'solid-js'
import type { JSX } from 'solid-js'

interface FixedTopBarProps {
  title?: string
  /** Renders a back button that calls this handler when provided. */
  onBack?: () => void
}

/** A fixed bar pinned to the top of the viewport, with an optional back button and title. */
export default function FixedTopBar(props: FixedTopBarProps): JSX.Element {
  return (
    <div class="fixed-top-bar">
      <Show when={props.onBack}>
        <button class="btn" onClick={() => props.onBack?.()}>
          ← Back
        </button>
      </Show>
      <Show when={props.title}>
        <span class="bar-title">{props.title}</span>
      </Show>
    </div>
  )
}
