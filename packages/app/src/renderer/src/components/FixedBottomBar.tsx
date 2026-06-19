import type { JSX } from 'solid-js'

interface FixedBottomBarProps {
  children: JSX.Element
}

/** A fixed bar pinned to the bottom of the viewport. Holds action buttons. */
export default function FixedBottomBar(props: FixedBottomBarProps): JSX.Element {
  return <div class="fixed-bottom-bar">{props.children}</div>
}
