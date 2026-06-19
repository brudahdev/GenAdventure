import { createMemo, createSignal, For, Index, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import type { ClothingItemConfig, OutfitConfig, OutfitSlotConfig } from '@gen-adventure/shared'
import CollapsibleSection from '../components/CollapsibleSection'
import FixedBottomBar from '../components/FixedBottomBar'
import FixedTopBar from '../components/FixedTopBar'
import MultiRefSelect from '../components/MultiRefSelect'
import SearchBar from '../components/SearchBar'

// --- Tree helper types and pure functions ---

interface FlatSlotNode {
  id: string
  path: number[]
  depth: number
  displayLabel: string
}

interface ValidationError {
  message: string
  slotPath?: number[]
  outfitIdx?: number
}

function flattenSlots(
  nodes: OutfitSlotConfig[],
  path: number[] = [],
  depth = 0,
  parentLabel = ''
): FlatSlotNode[] {
  const result: FlatSlotNode[] = []
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const nodePath = [...path, i]
    const label = parentLabel ? `${parentLabel} / ${node.id}` : node.id
    result.push({ id: node.id, path: nodePath, depth, displayLabel: label })
    if (node.subItems?.length) {
      result.push(...flattenSlots(node.subItems, nodePath, depth + 1, label))
    }
  }
  return result
}

function updateSlotAtPath(
  slots: OutfitSlotConfig[],
  path: number[],
  updater: (node: OutfitSlotConfig) => OutfitSlotConfig
): OutfitSlotConfig[] {
  if (path.length === 0) return slots
  const [head, ...tail] = path
  return slots.map((node, i) => {
    if (i !== head) return node
    if (tail.length === 0) return updater(node)
    return { ...node, subItems: updateSlotAtPath(node.subItems ?? [], tail, updater) }
  })
}

function deleteSlotAtPath(slots: OutfitSlotConfig[], path: number[]): OutfitSlotConfig[] {
  if (path.length === 0) return slots
  const [head, ...tail] = path
  if (tail.length === 0) return slots.filter((_, i) => i !== head)
  return slots.map((node, i) => {
    if (i !== head) return node
    return { ...node, subItems: deleteSlotAtPath(node.subItems ?? [], tail) }
  })
}

function addSubItemAt(
  slots: OutfitSlotConfig[],
  parentPath: number[],
  newNode: OutfitSlotConfig
): OutfitSlotConfig[] {
  if (parentPath.length === 0) return [...slots, newNode]
  const [head, ...tail] = parentPath
  return slots.map((node, i) => {
    if (i !== head) return node
    if (tail.length === 0) return { ...node, subItems: [...(node.subItems ?? []), newNode] }
    return { ...node, subItems: addSubItemAt(node.subItems ?? [], tail, newNode) }
  })
}

function uniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  let n = 1
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

const pathKey = (path: number[]): string => path.join('.')

// --- SlotNode: recursive inline tree node ---

function SlotNode(props: {
  node: OutfitSlotConfig
  path: number[]
  duplicateIds: Set<string>
  expanded: Set<string>
  onToggle: (path: number[]) => void
  onUpdateId: (path: number[], id: string) => void
  onAddSubItem: (path: number[]) => void
  onDelete: (path: number[]) => void
}): JSX.Element {
  const hasChildren = (): boolean => (props.node.subItems?.length ?? 0) > 0
  const isOpen = (): boolean => props.expanded.has(pathKey(props.path))

  const idError = (): string | null => {
    if (!props.node.id) return 'ID is required'
    if (props.duplicateIds.has(props.node.id)) return 'ID already exists'
    return null
  }

  return (
    <div class="tree-node">
      <div class="tree-row">
        <button
          class="tree-row-toggle"
          classList={{ 'is-leaf': !hasChildren() }}
          onClick={() => hasChildren() && props.onToggle(props.path)}
        >
          {isOpen() ? '▾' : '▸'}
        </button>
        <input
          class="field-input"
          classList={{ 'field-invalid': !!idError() }}
          type="text"
          value={props.node.id}
          onInput={(e) => props.onUpdateId(props.path, e.currentTarget.value)}
        />
        <button class="btn" onClick={() => props.onAddSubItem(props.path)}>
          + Sub-item
        </button>
        <button class="btn" style={{ color: '#e74c3c' }} onClick={() => props.onDelete(props.path)}>
          Delete
        </button>
      </div>
      <Show when={idError()}>
        <span class="field-error" style={{ 'margin-left': '26px' }}>
          {idError()}
        </span>
      </Show>

      <Show when={hasChildren() && isOpen()}>
        <div class="tree-children">
          <For each={props.node.subItems ?? []}>
            {(child, i) => (
              <SlotNode
                node={child}
                path={[...props.path, i()]}
                duplicateIds={props.duplicateIds}
                expanded={props.expanded}
                onToggle={props.onToggle}
                onUpdateId={props.onUpdateId}
                onAddSubItem={props.onAddSubItem}
                onDelete={props.onDelete}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

// --- OutfitEditor: edit a single outfit (id + clothing item refs) ---

function OutfitEditor(props: {
  outfit: OutfitConfig
  isOpen: boolean
  onToggle: () => void
  duplicateOutfitIds: Set<string>
  clothingItemIds: string[]
  clothingItemIdSet: Set<string>
  itemSlotMap: Map<string, string | undefined>
  onUpdate: (updated: OutfitConfig) => void
  onDelete: () => void
}): JSX.Element {
  const idError = (): string | null => {
    if (!props.outfit.id) return 'Outfit ID is required'
    if (props.duplicateOutfitIds.has(props.outfit.id)) return 'Outfit ID already exists'
    return null
  }

  // Slots used by more than one referenced item (slotless items ignored).
  const slotConflicts = createMemo((): string[] => {
    const bySlot = new Map<string, string[]>()
    for (const itemId of props.outfit.clothingItemIds) {
      const slot = props.itemSlotMap.get(itemId)
      if (!slot) continue
      const arr = bySlot.get(slot) ?? []
      arr.push(itemId)
      bySlot.set(slot, arr)
    }
    return [...bySlot.entries()]
      .filter(([, items]) => items.length > 1)
      .map(([slot, items]) => `Slot "${slot}" used by multiple items: ${items.join(', ')}`)
  })

  const patch = (p: Partial<OutfitConfig>): void => props.onUpdate({ ...props.outfit, ...p })

  return (
    <div class="appearance-item-card">
      <div class="appearance-item-header" style={{ cursor: 'pointer' }} onClick={props.onToggle}>
        <span class="list-row-name">{props.outfit.id || '(no id)'}</span>
        <span>{props.isOpen ? '▾' : '▸'}</span>
      </div>

      <Show when={props.isOpen}>
        <div class="field">
          <label class="field-label">OUTFIT ID</label>
          <input
            class="field-input"
            classList={{ 'field-invalid': !!idError() }}
            type="text"
            value={props.outfit.id}
            onInput={(e) => patch({ id: e.currentTarget.value })}
          />
          <Show when={idError()}>
            <span class="field-error">{idError()}</span>
          </Show>
        </div>

        <div class="field">
          <label class="field-label">CLOTHING ITEMS</label>
          <MultiRefSelect
            values={props.outfit.clothingItemIds}
            options={props.clothingItemIds}
            optionSet={props.clothingItemIdSet}
            onChange={(clothingItemIds) => patch({ clothingItemIds })}
            placeholder="Filter clothing items…"
          />
          <For each={slotConflicts()}>{(msg) => <span class="field-error">{msg}</span>}</For>
        </div>

        <button class="btn" style={{ color: '#e74c3c' }} onClick={props.onDelete}>
          Delete Outfit
        </button>
      </Show>
    </div>
  )
}

// --- Main page ---

export default function OutfitConfigPage(): JSX.Element {
  const navigate = useNavigate()

  const [slots, setSlots] = createSignal<OutfitSlotConfig[]>([])
  const [outfits, setOutfits] = createSignal<OutfitConfig[]>([])
  const [clothingItems, setClothingItems] = createSignal<ClothingItemConfig[]>([])
  const [status, setStatus] = createSignal('')
  const [errorList, setErrorList] = createSignal<ValidationError[]>([])
  const [expanded, setExpanded] = createSignal<Set<string>>(new Set())

  const flatSlotList = createMemo(() => flattenSlots(slots()))
  const allIds = createMemo(() => flatSlotList().map((n) => n.id))

  const duplicateIds = createMemo((): Set<string> => {
    const counts = new Map<string, number>()
    for (const id of allIds()) counts.set(id, (counts.get(id) ?? 0) + 1)
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n))
  })

  const clothingItemIds = createMemo(() => clothingItems().map((it) => it.id))
  const clothingItemIdSet = createMemo(() => new Set(clothingItemIds()))
  const itemSlotMap = createMemo((): Map<string, string | undefined> => {
    const m = new Map<string, string | undefined>()
    for (const it of clothingItems()) m.set(it.id, it.slot)
    return m
  })
  const [outfitFilter, setOutfitFilter] = createSignal('')
  const [expandedOutfits, setExpandedOutfits] = createSignal<Set<number>>(new Set())

  const outfitIds = createMemo(() => outfits().map((o) => o.id))
  const duplicateOutfitIds = createMemo((): Set<string> => {
    const counts = new Map<string, number>()
    for (const id of outfitIds()) counts.set(id, (counts.get(id) ?? 0) + 1)
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n))
  })

  const filteredOutfits = createMemo(() => {
    const q = outfitFilter().trim().toLowerCase()
    const mapped = outfits().map((o, i) => ({ outfit: o, realIdx: i }))
    return q ? mapped.filter(({ outfit }) => outfit.id.toLowerCase().includes(q)) : mapped
  })

  const collectErrors = (): ValidationError[] => {
    const errs: ValidationError[] = []
    for (const n of flatSlotList()) {
      if (!n.id) errs.push({ message: `Slot at "${n.displayLabel}": ID is required`, slotPath: n.path })
      else if (duplicateIds().has(n.id))
        errs.push({ message: `Slot "${n.id}": ID already exists`, slotPath: n.path })
    }

    outfits().forEach((outfit, idx) => {
      const label = outfit.id || `#${idx + 1}`
      if (!outfit.id) errs.push({ message: `Outfit #${idx + 1}: ID is required`, outfitIdx: idx })
      else if (duplicateOutfitIds().has(outfit.id))
        errs.push({ message: `Outfit "${outfit.id}": ID already exists`, outfitIdx: idx })

      // Existence of referenced clothing items.
      for (const itemId of outfit.clothingItemIds) {
        if (!clothingItemIdSet().has(itemId))
          errs.push({ message: `Outfit "${label}": clothing item "${itemId}" not found`, outfitIdx: idx })
      }

      // Each slot may be used by at most one referenced item (slotless items ignored).
      const itemsBySlot = new Map<string, string[]>()
      for (const itemId of outfit.clothingItemIds) {
        const slot = itemSlotMap().get(itemId)
        if (!slot) continue
        const arr = itemsBySlot.get(slot) ?? []
        arr.push(itemId)
        itemsBySlot.set(slot, arr)
      }
      for (const [slot, items] of itemsBySlot) {
        if (items.length > 1)
          errs.push({
            message: `Outfit "${label}": slot "${slot}" used by multiple items (${items.join(', ')})`,
            outfitIdx: idx
          })
      }
    })

    return errs
  }

  onMount(async () => {
    try {
      const raw = await window.electronAPI.saveData.read('configs/outfit.json')
      if (raw) {
        const parsed = JSON.parse(raw) as {
          outfitSlotConfig?: OutfitSlotConfig[]
          outfits?: OutfitConfig[]
        }
        setSlots(parsed.outfitSlotConfig ?? [])
        setOutfits(parsed.outfits ?? [])
      }
    } catch {
      // missing or malformed file — leave defaults
    }
    try {
      const raw = await window.electronAPI.saveData.read('configs/clothing.json')
      if (raw) {
        const parsed = JSON.parse(raw) as ClothingItemConfig[]
        if (Array.isArray(parsed)) setClothingItems(parsed)
      }
    } catch {
      // missing or malformed file — leave defaults
    }
  })

  const save = async (): Promise<void> => {
    const errs = collectErrors()
    if (errs.length > 0) {
      setErrorList(errs)
      return
    }
    setErrorList([])
    try {
      await window.electronAPI.saveData.write(
        'configs/outfit.json',
        JSON.stringify({ outfitSlotConfig: slots(), outfits: outfits() }, null, 2)
      )
      setStatus('Saved')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus(String(err))
    }
  }

  const goToError = (e: ValidationError): void => {
    if (e.outfitIdx !== undefined) {
      const idx = e.outfitIdx
      setOutfitFilter('')
      setExpandedOutfits((prev) => new Set(prev).add(idx))
      setErrorList([])
      setTimeout(() => document.getElementById(`outfit-${idx}`)?.scrollIntoView({ block: 'center' }), 0)
      return
    }
    // Expand every ancestor path so the offending node becomes visible.
    if (e.slotPath) {
      const path = e.slotPath
      setExpanded((prev) => {
        const next = new Set(prev)
        for (let i = 1; i < path.length; i++) next.add(pathKey(path.slice(0, i)))
        return next
      })
    }
    setErrorList([])
  }

  // --- Tree mutations ---

  const toggleExpand = (path: number[]): void => {
    setExpanded((prev) => {
      const next = new Set(prev)
      const key = pathKey(path)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const addTopLevelSlot = (): void => {
    setSlots((s) => [...s, { id: uniqueId('new-slot', new Set(allIds())) }])
  }

  const updateSlotId = (path: number[], id: string): void => {
    setSlots((s) => updateSlotAtPath(s, path, (n) => ({ ...n, id })))
  }

  const addSubItem = (path: number[]): void => {
    setSlots((s) =>
      addSubItemAt(s, path, { id: uniqueId('new-slot', new Set(allIds())) })
    )
    setExpanded((prev) => new Set(prev).add(pathKey(path)))
  }

  const deleteSlot = (path: number[]): void => {
    setSlots((s) => deleteSlotAtPath(s, path))
  }

  // --- Outfit mutations ---

  const toggleOutfit = (realIdx: number): void => {
    setExpandedOutfits((prev) => {
      const next = new Set(prev)
      next.has(realIdx) ? next.delete(realIdx) : next.add(realIdx)
      return next
    })
  }

  const addOutfit = (): void => {
    const newIdx = outfits().length
    setOutfits((o) => [...o, { id: uniqueId('new-outfit', new Set(outfitIds())), clothingItemIds: [] }])
    setExpandedOutfits((prev) => new Set(prev).add(newIdx))
  }

  const updateOutfit = (idx: number, updated: OutfitConfig): void => {
    setOutfits((o) => o.map((x, i) => (i === idx ? updated : x)))
  }

  const deleteOutfit = (idx: number): void => {
    setOutfits((o) => o.filter((_, i) => i !== idx))
  }

  return (
    <div class="list-page">
      <FixedTopBar title="Outfit Config" onBack={() => navigate(-1)} />

      <div class="list-area">
        <CollapsibleSection title="Outfit Slots" defaultOpen={false}>
          <div class="list-toolbar">
            <button class="btn btn-primary" onClick={addTopLevelSlot}>
              + Add Slot
            </button>
          </div>

          <For each={slots()}>
            {(node, i) => (
              <SlotNode
                node={node}
                path={[i()]}
                duplicateIds={duplicateIds()}
                expanded={expanded()}
                onToggle={toggleExpand}
                onUpdateId={updateSlotId}
                onAddSubItem={addSubItem}
                onDelete={deleteSlot}
              />
            )}
          </For>
        </CollapsibleSection>

        <CollapsibleSection title="Outfits" defaultOpen={true}>
          <div class="list-toolbar">
            <SearchBar
              value={outfitFilter()}
              onInput={setOutfitFilter}
              placeholder="Filter by ID…"
            />
            <button class="btn btn-primary" onClick={addOutfit}>
              + Add Outfit
            </button>
          </div>

          <Index each={filteredOutfits()}>
            {(entry) => (
              <div id={`outfit-${entry().realIdx}`}>
                <OutfitEditor
                  outfit={entry().outfit}
                  isOpen={expandedOutfits().has(entry().realIdx)}
                  onToggle={() => toggleOutfit(entry().realIdx)}
                  duplicateOutfitIds={duplicateOutfitIds()}
                  clothingItemIds={clothingItemIds()}
                  clothingItemIdSet={clothingItemIdSet()}
                  itemSlotMap={itemSlotMap()}
                  onUpdate={(updated) => updateOutfit(entry().realIdx, updated)}
                  onDelete={() => deleteOutfit(entry().realIdx)}
                />
              </div>
            )}
          </Index>
        </CollapsibleSection>
      </div>

      <FixedBottomBar>
        <button class="btn btn-primary" onClick={save}>
          Save
        </button>
        <Show when={status()}>
          <span style={{ color: status() === 'Saved' ? 'var(--text-muted)' : '#e74c3c' }}>
            {status()}
          </span>
        </Show>
      </FixedBottomBar>

      <Show when={errorList().length > 0}>
        <div class="modal-overlay" onClick={() => setErrorList([])}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Cannot save — {errorList().length} issue(s)</h2>
            <div
              style={{
                'max-height': '50vh',
                'overflow-y': 'auto',
                display: 'flex',
                'flex-direction': 'column',
                gap: '8px'
              }}
            >
              <For each={errorList()}>
                {(err) => (
                  <div class="list-row" onClick={() => goToError(err)}>
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
              <button class="btn" onClick={() => setErrorList([])}>
                Close
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
