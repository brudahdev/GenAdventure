import type { JSX } from 'solid-js'

interface ConfigButtonProps {
  label: string
  onClick: () => void
}

/** A labelled button used on the landing page to open configs. */
export default function ConfigButton(props: ConfigButtonProps): JSX.Element {
  return (
    <button class="btn config-button" onClick={() => props.onClick()}>
      {props.label}
    </button>
  )
}
