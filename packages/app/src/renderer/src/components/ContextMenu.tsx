import { createSignal, For, Show, onCleanup, onMount } from 'solid-js'
import type { JSX } from 'solid-js'

export interface ContextMenuItem {
  label: string
  /** Present → selecting this item cascades into a submenu. */
  children?: ContextMenuItem[]
  /** Present on leaves → invoked when the item is clicked. */
  onSelect?: () => void
  /** Render the label in the danger (red) color. */
  danger?: boolean
  /** Heading shown atop the submenu this item opens. */
  childLabel?: string
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
  /** false (default): root grows down from (x, y). true: root grows up. */
  openUp?: boolean
  /** 'right' (default): submenus cascade right. 'left': cascade left. */
  submenuSide?: 'left' | 'right'
  /** Optional heading shown atop the root level. */
  label?: string
}

interface MenuListProps {
  items: ContextMenuItem[]
  openUp: boolean
  submenuSide: 'left' | 'right'
  onClose: () => void
  /** Optional heading shown atop this level. */
  label?: string
}

/** One level of the cascade. Tracks which item's submenu is open so that opening
 *  a different item replaces (closes) the previous one. */
function MenuList(props: MenuListProps): JSX.Element {
  const [openIndex, setOpenIndex] = createSignal<number | null>(null)

  const onItemClick = (item: ContextMenuItem, index: number): void => {
    if (item.children && item.children.length > 0) {
      setOpenIndex((cur) => (cur === index ? null : index))
    } else {
      item.onSelect?.()
      props.onClose()
    }
  }

  return (
    <ul class="context-menu-list">
      <Show when={props.label}>
        <li class="context-menu-heading">{props.label}</li>
      </Show>
      <For each={props.items}>
        {(item, index) => {
          const hasChildren = (): boolean => !!item.children && item.children.length > 0
          return (
            <li class="context-menu-item-wrap">
              <button
                type="button"
                class="context-menu-item"
                classList={{
                  'has-children': hasChildren(),
                  'is-open': openIndex() === index(),
                  'is-danger': item.danger
                }}
                onClick={() => onItemClick(item, index())}
              >
                <span class="context-menu-label">{item.label}</span>
                <Show when={hasChildren()}>
                  <span class="context-menu-arrow">
                    {props.submenuSide === 'left' ? '◂' : '▸'}
                  </span>
                </Show>
              </button>
              <Show when={hasChildren() && openIndex() === index()}>
                <div
                  class="context-submenu"
                  classList={{
                    'submenu-left': props.submenuSide === 'left',
                    'submenu-right': props.submenuSide === 'right',
                    'submenu-up': props.openUp,
                    'submenu-down': !props.openUp
                  }}
                >
                  <MenuList
                    items={item.children!}
                    openUp={props.openUp}
                    submenuSide={props.submenuSide}
                    onClose={props.onClose}
                    label={item.childLabel}
                  />
                </div>
              </Show>
            </li>
          )
        }}
      </For>
    </ul>
  )
}

/**
 * A generic cascading context menu rendered at a fixed (x, y) anchor. Submenus
 * open to the side of their parent item; parent levels stay open. A click outside
 * the menu closes everything via `onClose`.
 */
export default function ContextMenu(props: ContextMenuProps): JSX.Element {
  let rootEl!: HTMLDivElement
  const openUp = (): boolean => props.openUp ?? false
  const submenuSide = (): 'left' | 'right' => props.submenuSide ?? 'right'

  onMount(() => {
    const onPointerDown = (e: PointerEvent): void => {
      if (rootEl && !rootEl.contains(e.target as Node)) props.onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    onCleanup(() => document.removeEventListener('pointerdown', onPointerDown))
  })

  const style = (): JSX.CSSProperties => {
    const s: JSX.CSSProperties = { left: `${props.x}px` }
    if (openUp()) s.bottom = `${window.innerHeight - props.y}px`
    else s.top = `${props.y}px`
    return s
  }

  return (
    <div class="context-menu" ref={rootEl} style={style()}>
      <MenuList
        items={props.items}
        openUp={openUp()}
        submenuSide={submenuSide()}
        onClose={props.onClose}
        label={props.label}
      />
    </div>
  )
}
