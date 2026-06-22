import { createMemo, createSignal, For, Index, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import type {
  AppearanceClassConfig,
  ClothingItemConfig,
  ClothingItemStateConfig,
  ClothingItemStateEntryConfig,
  ClothingStateTransition,
  OutfitSlotConfig
} from '@gen-adventure/shared'
import CollapsibleSection from '../components/CollapsibleSection'
import FilteredSelect from '../components/FilteredSelect'
import FixedBottomBar from '../components/FixedBottomBar'
import FixedTopBar from '../components/FixedTopBar'
import MultiRefSelect from '../components/MultiRefSelect'
import SearchBar from '../components/SearchBar'
import StringListEditor from '../components/StringListEditor'

// --- Helper types ---

interface ValidationError {
  message: string
  itemIdx: number
}

// --- Pure helpers ---

function flattenClassNames(nodes: AppearanceClassConfig[]): string[] {
  const out: string[] = []
  for (const node of nodes) {
    out.push(node.class)
    if (node.subClasses?.length) out.push(...flattenClassNames(node.subClasses))
  }
  return out
}

function flattenSlotIds(nodes: OutfitSlotConfig[]): string[] {
  const out: string[] = []
  for (const node of nodes) {
    out.push(node.id)
    if (node.subItems?.length) out.push(...flattenSlotIds(node.subItems))
  }
  return out
}

function uniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  let n = 1
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

// --- ItemEditor: edit a single clothing item (fields + states) ---

function ItemEditor(props: {
  item: ClothingItemConfig
  duplicateItemIds: Set<string>
  otherItemIds: string[]
  appearanceClassNames: string[]
  appearanceClassSet: Set<string>
  outfitSlotIds: string[]
  outfitSlotSet: Set<string>
  onUpdate: (updated: ClothingItemConfig) => void
  onDelete: () => void
}): JSX.Element {
  const stateIds = createMemo(() => props.item.states.map((s) => s.id).filter(Boolean))

  const idError = (): string | null => {
    if (!props.item.id) return 'Item ID is required'
    if (props.duplicateItemIds.has(props.item.id)) return 'Item ID already exists'
    return null
  }
  const nameError = (): string | null => (props.item.name ? null : 'Name is required')
  const contextError = (): string | null => (props.item.context ? null : 'Context is required')

  const patch = (p: Partial<ClothingItemConfig>): void => props.onUpdate({ ...props.item, ...p })

  // --- State mutations ---
  const updateState = (idx: number, p: Partial<ClothingItemStateConfig>): void => {
    const states = props.item.states.map((s, i) => (i === idx ? { ...s, ...p } : s))
    patch({ states })
  }
  const removeState = (idx: number): void => {
    patch({ states: props.item.states.filter((_, i) => i !== idx) })
  }
  const addState = (): void => {
    const existing = new Set(stateIds())
    patch({
      states: [...props.item.states, { id: uniqueId('new-state', existing), verb: '', tags: [] }]
    })
  }

  // --- Entry mutations (within a state) ---
  const updateEntry = (
    sIdx: number,
    eIdx: number,
    p: Partial<ClothingItemStateEntryConfig>
  ): void => {
    const state = props.item.states[sIdx]
    const enteries = (state.enteries ?? []).map((e, i) => (i === eIdx ? { ...e, ...p } : e))
    updateState(sIdx, { enteries })
  }
  const removeEntry = (sIdx: number, eIdx: number): void => {
    const state = props.item.states[sIdx]
    updateState(sIdx, { enteries: (state.enteries ?? []).filter((_, i) => i !== eIdx) })
  }
  const addEntry = (sIdx: number): void => {
    const state = props.item.states[sIdx]
    updateState(sIdx, { enteries: [...(state.enteries ?? []), {}] })
  }

  // --- Transition mutations (within a state) ---
  const updateTransition = (
    sIdx: number,
    tIdx: number,
    p: Partial<ClothingStateTransition>
  ): void => {
    const state = props.item.states[sIdx]
    const transitions = (state.transitions ?? []).map((t, i) => (i === tIdx ? { ...t, ...p } : t))
    updateState(sIdx, { transitions })
  }
  const removeTransition = (sIdx: number, tIdx: number): void => {
    const state = props.item.states[sIdx]
    updateState(sIdx, { transitions: (state.transitions ?? []).filter((_, i) => i !== tIdx) })
  }
  const addTransition = (sIdx: number): void => {
    const state = props.item.states[sIdx]
    updateState(sIdx, { transitions: [...(state.transitions ?? []), { id: '', tags: [] }] })
  }

  return (
    <div class="group" style={{ 'margin-top': '10px' }}>
      <div class="field">
        <label class="field-label">ITEM ID</label>
        <input
          class="field-input"
          classList={{ 'field-invalid': !!idError() }}
          type="text"
          value={props.item.id}
          onInput={(e) => patch({ id: e.currentTarget.value })}
        />
        <Show when={idError()}>
          <span class="field-error">{idError()}</span>
        </Show>
      </div>

      <div class="field">
        <label class="field-label">NAME</label>
        <input
          class="field-input"
          classList={{ 'field-invalid': !!nameError() }}
          type="text"
          value={props.item.name}
          onInput={(e) => patch({ name: e.currentTarget.value })}
        />
        <Show when={nameError()}>
          <span class="field-error">{nameError()}</span>
        </Show>
      </div>

      <div class="field">
        <label class="field-label">CONTEXT</label>
        <textarea
          class="field-input"
          classList={{ 'field-invalid': !!contextError() }}
          rows={3}
          value={props.item.context}
          onInput={(e) => patch({ context: e.currentTarget.value })}
        />
        <Show when={contextError()}>
          <span class="field-error">{contextError()}</span>
        </Show>
      </div>

      <div class="field">
        <label class="field-label">SLOT</label>
        <FilteredSelect
          options={props.outfitSlotIds}
          value={props.item.slot ?? ''}
          onChange={(v) => patch({ slot: v || undefined })}
          placeholder="Filter slots…"
          invalid={!!props.item.slot && !props.outfitSlotSet.has(props.item.slot)}
          errorMessage={
            !!props.item.slot && !props.outfitSlotSet.has(props.item.slot)
              ? 'Slot not found'
              : undefined
          }
        />
      </div>

      <div class="field">
        <label class="field-label">SISTER ITEM</label>
        <FilteredSelect
          options={props.otherItemIds}
          value={props.item.sisterId ?? ''}
          onChange={(v) => patch({ sisterId: v || undefined })}
          placeholder="Filter items…"
          invalid={!!props.item.sisterId && !props.otherItemIds.includes(props.item.sisterId)}
          errorMessage={
            !!props.item.sisterId && !props.otherItemIds.includes(props.item.sisterId)
              ? 'Item not found'
              : undefined
          }
        />
      </div>

      <label class="toggle-row">
        <input
          type="checkbox"
          checked={props.item.transParentIfWet ?? false}
          onChange={(e) => patch({ transParentIfWet: e.currentTarget.checked || undefined })}
        />
        Transparent if wet
      </label>
      <label class="toggle-row">
        <input
          type="checkbox"
          checked={props.item.isATop ?? false}
          onChange={(e) => patch({ isATop: e.currentTarget.checked || undefined })}
        />
        Is a top
      </label>

      <StringListEditor
        label="TAGS"
        values={props.item.tags ?? []}
        onChange={(tags) => patch({ tags })}
        placeholder="Add tag…"
      />
      <StringListEditor
        label="EXCLUDE TAGS"
        values={props.item.excludeTags ?? []}
        onChange={(excludeTags) => patch({ excludeTags: excludeTags.length ? excludeTags : undefined })}
        placeholder="Add exclude tag…"
      />

      <CollapsibleSection title="States" defaultOpen={false}>
        <Index each={props.item.states}>
          {(state, sIdx) => (
            <div class="appearance-item-card">
              <div class="appearance-item-header">
                <span class="list-row-name">State {sIdx + 1}</span>
                <button class="btn" onClick={() => removeState(sIdx)}>
                  Remove
                </button>
              </div>

              <div class="field">
                <label class="field-label">STATE ID</label>
                <input
                  class="field-input"
                  classList={{ 'field-invalid': !state().id }}
                  type="text"
                  value={state().id}
                  onInput={(e) => updateState(sIdx, { id: e.currentTarget.value })}
                />
                <Show when={!state().id}>
                  <span class="field-error">State ID is required</span>
                </Show>
              </div>

              <div class="field">
                <label class="field-label">VERB</label>
                <input
                  class="field-input"
                  classList={{ 'field-invalid': !state().verb }}
                  type="text"
                  value={state().verb ?? ''}
                  onInput={(e) => updateState(sIdx, { verb: e.currentTarget.value })}
                />
                <Show when={!state().verb}>
                  <span class="field-error">Verb is required</span>
                </Show>
              </div>

              <div class="field">
                <label class="field-label">STATE CONTEXT</label>
                <input
                  class="field-input"
                  type="text"
                  value={state().state_context ?? ''}
                  onInput={(e) =>
                    updateState(sIdx, { state_context: e.currentTarget.value || undefined })
                  }
                />
              </div>

              <label class="toggle-row">
                <input
                  type="checkbox"
                  checked={state().occludesSubItems ?? false}
                  onChange={(e) =>
                    updateState(sIdx, { occludesSubItems: e.currentTarget.checked || undefined })
                  }
                />
                Occludes sub-items
              </label>
              <label class="toggle-row">
                <input
                  type="checkbox"
                  checked={state().obstructsSubItems ?? false}
                  onChange={(e) =>
                    updateState(sIdx, { obstructsSubItems: e.currentTarget.checked || undefined })
                  }
                />
                Obstructs sub-items
              </label>

              <div class="field">
                <label class="field-label">COVERS APPEARANCE CLASSES</label>
                <MultiRefSelect
                  values={state().coversAppearanceClasses ?? []}
                  options={props.appearanceClassNames}
                  optionSet={props.appearanceClassSet}
                  onChange={(v) =>
                    updateState(sIdx, { coversAppearanceClasses: v.length ? v : undefined })
                  }
                  placeholder="Filter classes…"
                />
              </div>

              <CollapsibleSection title="Entries" defaultOpen={false}>
                <Index each={state().enteries ?? []}>
                  {(entry, eIdx) => (
                    <div class="appearance-item-card">
                      <div class="appearance-item-header">
                        <span class="list-row-name">Entry {eIdx + 1}</span>
                        <button class="btn" onClick={() => removeEntry(sIdx, eIdx)}>
                          Remove
                        </button>
                      </div>
                      <div class="field">
                        <label class="field-label">PROMPT TEXT</label>
                        <input
                          class="field-input"
                          type="text"
                          value={entry().img_txt ?? ''}
                          onInput={(e) =>
                            updateEntry(sIdx, eIdx, { img_txt: e.currentTarget.value || undefined })
                          }
                        />
                      </div>
                      <div class="field">
                        <label class="field-label">NEGATIVE PROMPT</label>
                        <input
                          class="field-input"
                          type="text"
                          value={entry().img_txt_neg ?? ''}
                          onInput={(e) =>
                            updateEntry(sIdx, eIdx, {
                              img_txt_neg: e.currentTarget.value || undefined
                            })
                          }
                        />
                      </div>
                      <div class="field">
                        <label class="field-label">FOR APPEARANCE CLASS</label>
                        <FilteredSelect
                          options={props.appearanceClassNames}
                          value={entry().forAppearanceClass ?? ''}
                          onChange={(v) =>
                            updateEntry(sIdx, eIdx, { forAppearanceClass: v || undefined })
                          }
                          placeholder="Filter classes…"
                          invalid={
                            !!entry().forAppearanceClass &&
                            !props.appearanceClassSet.has(entry().forAppearanceClass!)
                          }
                          errorMessage={
                            !!entry().forAppearanceClass &&
                            !props.appearanceClassSet.has(entry().forAppearanceClass!)
                              ? 'Class not found'
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  )}
                </Index>
                <button class="btn" onClick={() => addEntry(sIdx)}>
                  + Add Entry
                </button>
              </CollapsibleSection>

              <CollapsibleSection title="Transitions" defaultOpen={false}>
                <Index each={state().transitions ?? []}>
                  {(trans, tIdx) => (
                    <div class="appearance-item-card">
                      <div class="appearance-item-header">
                        <span class="list-row-name">Transition {tIdx + 1}</span>
                        <button class="btn" onClick={() => removeTransition(sIdx, tIdx)}>
                          Remove
                        </button>
                      </div>
                      <div class="field">
                        <label class="field-label">TARGET STATE</label>
                        <FilteredSelect
                          options={stateIds()}
                          value={trans().id}
                          onChange={(v) => updateTransition(sIdx, tIdx, { id: v })}
                          placeholder="Filter states…"
                          invalid={!!trans().id && !stateIds().includes(trans().id)}
                          errorMessage={
                            !trans().id
                              ? 'Target state is required'
                              : !stateIds().includes(trans().id)
                                ? 'State not found'
                                : undefined
                          }
                        />
                      </div>
                      <StringListEditor
                        label="TAGS"
                        values={trans().tags ?? []}
                        onChange={(tags) => updateTransition(sIdx, tIdx, { tags })}
                        placeholder="Add tag…"
                      />
                      <StringListEditor
                        label="EXCLUDE TAGS"
                        values={trans().excludeTags ?? []}
                        onChange={(v) =>
                          updateTransition(sIdx, tIdx, { excludeTags: v.length ? v : undefined })
                        }
                        placeholder="Add exclude tag…"
                      />
                    </div>
                  )}
                </Index>
                <button class="btn" onClick={() => addTransition(sIdx)}>
                  + Add Transition
                </button>
              </CollapsibleSection>

              <StringListEditor
                label="STATE TAGS"
                values={state().tags ?? []}
                onChange={(tags) => updateState(sIdx, { tags })}
                placeholder="Add tag…"
              />
              <StringListEditor
                label="STATE EXCLUDE TAGS"
                values={state().excludeTags ?? []}
                onChange={(v) => updateState(sIdx, { excludeTags: v.length ? v : undefined })}
                placeholder="Add exclude tag…"
              />
            </div>
          )}
        </Index>
        <button class="btn" onClick={addState}>
          + Add State
        </button>
      </CollapsibleSection>

      <button class="btn" style={{ color: '#e74c3c' }} onClick={props.onDelete}>
        Delete Item
      </button>
    </div>
  )
}

// --- Main page ---

export default function ClothingItemConfigPage(): JSX.Element {
  const navigate = useNavigate()

  const [items, setItems] = createSignal<ClothingItemConfig[]>([])
  const [appearanceClassNames, setAppearanceClassNames] = createSignal<string[]>([])
  const [outfitSlotIds, setOutfitSlotIds] = createSignal<string[]>([])

  const [status, setStatus] = createSignal('')
  const [errorList, setErrorList] = createSignal<ValidationError[]>([])
  const [itemFilter, setItemFilter] = createSignal('')
  const [selectedItemIdx, setSelectedItemIdx] = createSignal<number | null>(null)

  const allItemIds = createMemo(() => items().map((it) => it.id))
  const itemIdSet = createMemo(() => new Set(allItemIds()))
  const appearanceClassSet = createMemo(() => new Set(appearanceClassNames()))
  const outfitSlotSet = createMemo(() => new Set(outfitSlotIds()))

  const duplicateItemIds = createMemo((): Set<string> => {
    const counts = new Map<string, number>()
    for (const id of allItemIds()) counts.set(id, (counts.get(id) ?? 0) + 1)
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n))
  })

  const collectErrors = (): ValidationError[] => {
    const errs: ValidationError[] = []
    items().forEach((item, idx) => {
      const label = item.id || `#${idx + 1}`
      if (!item.id) errs.push({ message: `Item #${idx + 1}: ID is required`, itemIdx: idx })
      else if (duplicateItemIds().has(item.id))
        errs.push({ message: `Item "${item.id}": ID already exists`, itemIdx: idx })
      if (!item.name) errs.push({ message: `Item "${label}": name is required`, itemIdx: idx })
      if (!item.context) errs.push({ message: `Item "${label}": context is required`, itemIdx: idx })
      if (item.slot && !outfitSlotSet().has(item.slot))
        errs.push({ message: `Item "${label}": slot "${item.slot}" not found`, itemIdx: idx })
      if (item.sisterId) {
        if (item.sisterId === item.id)
          errs.push({ message: `Item "${label}": sister item cannot be itself`, itemIdx: idx })
        else if (!itemIdSet().has(item.sisterId))
          errs.push({ message: `Item "${label}": sister item "${item.sisterId}" not found`, itemIdx: idx })
      }

      const stateIds = new Set<string>()
      const stateIdCounts = new Map<string, number>()
      for (const s of item.states) stateIdCounts.set(s.id, (stateIdCounts.get(s.id) ?? 0) + 1)

      item.states.forEach((state, sIdx) => {
        const sLabel = state.id || `#${sIdx + 1}`
        if (!state.id) errs.push({ message: `Item "${label}" → state #${sIdx + 1}: ID is required`, itemIdx: idx })
        else if ((stateIdCounts.get(state.id) ?? 0) > 1)
          errs.push({ message: `Item "${label}" → state "${state.id}": ID is duplicated`, itemIdx: idx })
        state.coversAppearanceClasses?.forEach((c) => {
          if (c && !appearanceClassSet().has(c))
            errs.push({ message: `Item "${label}" → state "${sLabel}": class "${c}" not found`, itemIdx: idx })
        })
        state.enteries?.forEach((e, eIdx) => {
          if (e.forAppearanceClass && !appearanceClassSet().has(e.forAppearanceClass))
            errs.push({ message: `Item "${label}" → state "${sLabel}" → entry ${eIdx + 1}: class "${e.forAppearanceClass}" not found`, itemIdx: idx })
        })
        stateIds.add(state.id)
      })

      item.states.forEach((state, sIdx) => {
        const sLabel = state.id || `#${sIdx + 1}`
        state.transitions?.forEach((t, tIdx) => {
          if (!t.id)
            errs.push({ message: `Item "${label}" → state "${sLabel}" → transition ${tIdx + 1}: target state is required`, itemIdx: idx })
          else if (!stateIds.has(t.id))
            errs.push({ message: `Item "${label}" → state "${sLabel}" → transition ${tIdx + 1}: state "${t.id}" not found`, itemIdx: idx })
        })
      })
    })
    return errs
  }

  const filteredItems = createMemo(() => {
    const q = itemFilter().trim().toLowerCase()
    if (!q) return items()
    return items().filter(
      (it) => it.id.toLowerCase().includes(q) || it.name?.toLowerCase().includes(q)
    )
  })

  const selectedItem = createMemo(() => {
    const idx = selectedItemIdx()
    return idx !== null ? (items()[idx] ?? null) : null
  })

  onMount(async () => {
    try {
      const raw = await window.electronAPI.saveData.read('configs/clothing.json')
      if (raw) {
        const parsed = JSON.parse(raw) as ClothingItemConfig[]
        if (Array.isArray(parsed)) setItems(parsed)
      }
    } catch {
      // missing or malformed file — leave defaults
    }
    try {
      const raw = await window.electronAPI.saveData.read('configs/appearance.json')
      if (raw) {
        const parsed = JSON.parse(raw) as { appearanceClasses?: AppearanceClassConfig[] }
        setAppearanceClassNames(flattenClassNames(parsed.appearanceClasses ?? []))
      }
    } catch {
      // ignore
    }
    try {
      const raw = await window.electronAPI.saveData.read('configs/outfit.json')
      if (raw) {
        const parsed = JSON.parse(raw) as { outfitSlotConfig?: OutfitSlotConfig[] }
        setOutfitSlotIds(flattenSlotIds(parsed.outfitSlotConfig ?? []))
      }
    } catch {
      // ignore
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
      await window.electronAPI.saveData.write('configs/clothing.json', JSON.stringify(items(), null, 2))
      setStatus('Saved')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus(String(err))
    }
  }

  const goToError = (e: ValidationError): void => {
    setItemFilter('')
    setSelectedItemIdx(e.itemIdx)
    setErrorList([])
  }

  // --- Item mutations ---

  const addItem = (): void => {
    setItems((arr) => [
      ...arr,
      { id: uniqueId('new-item', itemIdSet()), name: '', context: '', states: [], tags: [] }
    ])
    setSelectedItemIdx(items().length - 1)
  }

  const updateItem = (updated: ClothingItemConfig): void => {
    const idx = selectedItemIdx()
    if (idx === null) return
    setItems((arr) => arr.map((it, i) => (i === idx ? updated : it)))
  }

  const deleteItem = (): void => {
    const idx = selectedItemIdx()
    if (idx === null) return
    setItems((arr) => arr.filter((_, i) => i !== idx))
    setSelectedItemIdx(null)
  }

  return (
    <div class="list-page">
      <FixedTopBar title="Clothing Item Config" onBack={() => navigate(-1)} />

      <div class="list-area">
        <CollapsibleSection title="Clothing Items" defaultOpen={true}>
          <div class="list-toolbar">
            <SearchBar
              value={itemFilter()}
              onInput={setItemFilter}
              placeholder="Filter by ID or name…"
            />
            <button class="btn btn-primary" onClick={addItem}>
              + Add Item
            </button>
          </div>

          <For each={filteredItems()}>
            {(item) => {
              const realIdx = (): number => items().indexOf(item)
              return (
                <div
                  class="list-row"
                  classList={{ 'list-row-selected': selectedItemIdx() === realIdx() }}
                  onClick={() => setSelectedItemIdx(realIdx())}
                >
                  <div class="list-row-info">
                    <span class="list-row-name">{item.name || item.id}</span>
                    <span class="list-row-desc">
                      {item.id} · {item.states.length} state(s)
                    </span>
                  </div>
                </div>
              )
            }}
          </For>
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

      <Show when={selectedItem()}>
        {(item) => (
          <div class="modal-overlay" onClick={() => setSelectedItemIdx(null)}>
            <div class="modal" style={{ width: 'min(680px, 95vw)' }} onClick={(e) => e.stopPropagation()}>
              <h2>Edit Clothing Item</h2>
              <div style={{ 'max-height': '70vh', 'overflow-y': 'auto' }}>
                <ItemEditor
                  item={item()}
                  duplicateItemIds={duplicateItemIds()}
                  otherItemIds={allItemIds().filter((id) => id !== item().id)}
                  appearanceClassNames={appearanceClassNames()}
                  appearanceClassSet={appearanceClassSet()}
                  outfitSlotIds={outfitSlotIds()}
                  outfitSlotSet={outfitSlotSet()}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                />
              </div>
              <div class="modal-actions">
                <button class="btn" onClick={() => setSelectedItemIdx(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>

      <Show when={errorList().length > 0}>
        <div class="modal-overlay" onClick={() => setErrorList([])}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Cannot save — {errorList().length} issue(s)</h2>
            <div style={{ 'max-height': '50vh', 'overflow-y': 'auto', display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
              <For each={errorList()}>
                {(err) => (
                  <div class="list-row" onClick={() => goToError(err)}>
                    <div class="list-row-info">
                      <span class="field-error" style={{ 'margin-top': '0' }}>{err.message}</span>
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
