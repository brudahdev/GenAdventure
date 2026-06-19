import { createMemo, createSignal, For, Index, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import type {
  AppearanceClassConfig,
  AppearanceConfig,
  AppearanceEntryConfig,
  AppearanceItemConfig
} from '@gen-adventure/shared'
import CollapsibleSection from '../components/CollapsibleSection'
import FilteredSelect from '../components/FilteredSelect'
import FixedBottomBar from '../components/FixedBottomBar'
import FixedTopBar from '../components/FixedTopBar'
import SearchBar from '../components/SearchBar'

// --- Tree helper types and pure functions ---

interface FlatClassNode {
  class: string
  path: number[]
  depth: number
  displayLabel: string
}

interface ValidationError {
  message: string
  entryIdx?: number
  classPath?: number[]
}

function flattenClasses(
  nodes: AppearanceClassConfig[],
  path: number[] = [],
  depth = 0,
  parentLabel = ''
): FlatClassNode[] {
  const result: FlatClassNode[] = []
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const nodePath = [...path, i]
    const label = parentLabel ? `${parentLabel} / ${node.class}` : node.class
    result.push({ class: node.class, path: nodePath, depth, displayLabel: label })
    if (node.subClasses?.length) {
      result.push(...flattenClasses(node.subClasses, nodePath, depth + 1, label))
    }
  }
  return result
}

function resolveClassByPath(
  nodes: AppearanceClassConfig[],
  path: number[] | null
): AppearanceClassConfig | null {
  if (!path || path.length === 0) return null
  let arr = nodes
  let current: AppearanceClassConfig | null = null
  for (const idx of path) {
    current = arr[idx] ?? null
    if (!current) return null
    arr = current.subClasses ?? []
  }
  return current
}

function updateClassAtPath(
  classes: AppearanceClassConfig[],
  path: number[],
  updater: (node: AppearanceClassConfig) => AppearanceClassConfig
): AppearanceClassConfig[] {
  if (path.length === 0) return classes
  const [head, ...tail] = path
  return classes.map((node, i) => {
    if (i !== head) return node
    if (tail.length === 0) return updater(node)
    return { ...node, subClasses: updateClassAtPath(node.subClasses ?? [], tail, updater) }
  })
}

function deleteClassAtPath(
  classes: AppearanceClassConfig[],
  path: number[]
): AppearanceClassConfig[] {
  if (path.length === 0) return classes
  const [head, ...tail] = path
  if (tail.length === 0) return classes.filter((_, i) => i !== head)
  return classes.map((node, i) => {
    if (i !== head) return node
    return { ...node, subClasses: deleteClassAtPath(node.subClasses ?? [], tail) }
  })
}

function addSubClassAt(
  classes: AppearanceClassConfig[],
  parentPath: number[],
  newNode: AppearanceClassConfig
): AppearanceClassConfig[] {
  if (parentPath.length === 0) return [...classes, newNode]
  const [head, ...tail] = parentPath
  return classes.map((node, i) => {
    if (i !== head) return node
    if (tail.length === 0) return { ...node, subClasses: [...(node.subClasses ?? []), newNode] }
    return { ...node, subClasses: addSubClassAt(node.subClasses ?? [], tail, newNode) }
  })
}

function uniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  let n = 1
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

function pathsEqual(a: number[] | null, b: number[] | null): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return a.length === b.length && a.every((v, i) => v === b[i])
}

// --- ClassEditor: edit a single class node (name + direct sub-classes) ---

function ClassEditor(props: {
  node: AppearanceClassConfig
  duplicateClassNames: Set<string>
  onUpdateName: (name: string) => void
  onAddSubClass: () => void
  onRemoveSubClass: (subIdx: number) => void
  onDelete: () => void
}): JSX.Element {
  const classError = (): string | null => {
    if (!props.node.class) return 'Class name is required'
    if (props.duplicateClassNames.has(props.node.class)) return 'Class name already exists'
    return null
  }

  return (
    <div class="group" style={{ 'margin-top': '10px' }}>
      <div class="field">
        <label class="field-label">CLASS NAME</label>
        <input
          class="field-input"
          classList={{ 'field-invalid': !!classError() }}
          type="text"
          value={props.node.class}
          onInput={(e) => props.onUpdateName(e.currentTarget.value)}
        />
        <Show when={classError()}>
          <span class="field-error">{classError()}</span>
        </Show>
      </div>
      <div class="field">
        <label class="field-label">SUB-CLASSES</label>
        <Show
          when={(props.node.subClasses ?? []).length > 0}
          fallback={<span style={{ color: 'var(--text-muted)', 'font-size': '13px' }}>None</span>}
        >
          <For each={props.node.subClasses ?? []}>
            {(sub, i) => (
              <div class="list-row" style={{ 'margin-bottom': '4px' }}>
                <span class="list-row-name">{sub.class}</span>
                <button class="btn" onClick={() => props.onRemoveSubClass(i())}>
                  Remove
                </button>
              </div>
            )}
          </For>
        </Show>
        <button class="btn" style={{ 'margin-top': '6px' }} onClick={props.onAddSubClass}>
          + Add Sub-class
        </button>
      </div>
      <button class="btn" style={{ color: '#e74c3c' }} onClick={props.onDelete}>
        Delete Class
      </button>
    </div>
  )
}

// --- EntryEditor: edit a single appearance entry (ID, items, overrides) ---

function EntryEditor(props: {
  entry: AppearanceEntryConfig
  classNameSet: Set<string>
  entryIdSet: Set<string>
  duplicateEntryIds: Set<string>
  allClassNames: string[]
  allEntryIds: string[]
  onUpdate: (updated: AppearanceEntryConfig) => void
  onDelete: () => void
}): JSX.Element {
  const [newOverride, setNewOverride] = createSignal('')

  const entryIdError = (): string | null => {
    if (!props.entry.id) return 'Entry ID is required'
    if (props.duplicateEntryIds.has(props.entry.id)) return 'Entry ID already exists'
    return null
  }

  const updateItem = (idx: number, patch: Partial<AppearanceItemConfig>): void => {
    const items = [...(props.entry.items ?? [])]
    items[idx] = { ...items[idx], ...patch }
    props.onUpdate({ ...props.entry, items })
  }

  const removeItem = (idx: number): void => {
    props.onUpdate({ ...props.entry, items: (props.entry.items ?? []).filter((_, i) => i !== idx) })
  }

  const addItem = (): void => {
    props.onUpdate({
      ...props.entry,
      items: [...(props.entry.items ?? []), { id: 'new-item' } as AppearanceItemConfig]
    })
  }

  const updateOverride = (idx: number, val: string): void => {
    const overrides = [...(props.entry.overrides ?? [])]
    overrides[idx] = val
    props.onUpdate({ ...props.entry, overrides })
  }

  const removeOverride = (idx: number): void => {
    props.onUpdate({
      ...props.entry,
      overrides: (props.entry.overrides ?? []).filter((_, i) => i !== idx)
    })
  }

  const addOverride = (): void => {
    const val = newOverride()
    if (!val) return
    props.onUpdate({ ...props.entry, overrides: [...(props.entry.overrides ?? []), val] })
    setNewOverride('')
  }

  return (
    <div class="group" style={{ 'margin-top': '10px' }}>
      <div class="field">
        <label class="field-label">ENTRY ID</label>
        <input
          class="field-input"
          classList={{ 'field-invalid': !!entryIdError() }}
          type="text"
          value={props.entry.id}
          onInput={(e) => props.onUpdate({ ...props.entry, id: e.currentTarget.value })}
        />
        <Show when={entryIdError()}>
          <span class="field-error">{entryIdError()}</span>
        </Show>
      </div>

      <CollapsibleSection title="Items" defaultOpen={false}>
        <Index each={props.entry.items ?? []}>
          {(item, i) => (
            <div class="appearance-item-card">
              <div class="appearance-item-header">
                <span class="list-row-name">Item {i + 1}</span>
                <button class="btn" onClick={() => removeItem(i)}>
                  Remove
                </button>
              </div>
              <div class="field">
                <label class="field-label">CLASS</label>
                <FilteredSelect
                  options={props.allClassNames}
                  value={item().class ?? ''}
                  onChange={(v) => updateItem(i, { class: v || undefined })}
                  placeholder="Filter classes…"
                  invalid={!!item().class && !props.classNameSet.has(item().class!)}
                  errorMessage={!!item().class && !props.classNameSet.has(item().class!) ? 'Class not found' : undefined}
                />
              </div>
              <div class="field">
                <label class="field-label">ID</label>
                <input
                  class="field-input"
                  type="text"
                  value={item().id}
                  onInput={(e) => updateItem(i, { id: e.currentTarget.value })}
                />
              </div>
              <div class="field">
                <label class="field-label">PROMPT TEXT</label>
                <input
                  class="field-input"
                  type="text"
                  value={item().img_txt ?? ''}
                  onInput={(e) =>
                    updateItem(i, { img_txt: e.currentTarget.value || undefined })
                  }
                />
              </div>
              <div class="field">
                <label class="field-label">NEGATIVE PROMPT</label>
                <input
                  class="field-input"
                  type="text"
                  value={item().img_txt_neg ?? ''}
                  onInput={(e) =>
                    updateItem(i, { img_txt_neg: e.currentTarget.value || undefined })
                  }
                />
              </div>
              <div class="field">
                <label class="field-label">CONTEXT TEXT</label>
                <input
                  class="field-input"
                  type="text"
                  value={item().ctx_txt ?? ''}
                  onInput={(e) =>
                    updateItem(i, { ctx_txt: e.currentTarget.value || undefined })
                  }
                />
              </div>
              <label class="toggle-row">
                <input
                  type="checkbox"
                  checked={item().include_in_ctx ?? false}
                  onChange={(e) =>
                    updateItem(i, { include_in_ctx: e.currentTarget.checked || undefined })
                  }
                />
                Include in context
              </label>
              <label class="toggle-row">
                <input
                  type="checkbox"
                  checked={item().ingnore_clothing_covering ?? false}
                  onChange={(e) =>
                    updateItem(i, {
                      ingnore_clothing_covering: e.currentTarget.checked || undefined
                    })
                  }
                />
                Ignore clothing covering
              </label>
            </div>
          )}
        </Index>
        <button class="btn" onClick={addItem}>
          + Add Item
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="Overrides" defaultOpen={false}>
        <For each={props.entry.overrides ?? []}>
          {(override, i) => (
            <div class="list-toolbar">
              <div style={{ flex: '1' }}>
                <FilteredSelect
                  options={props.allEntryIds}
                  value={override}
                  onChange={(v) => updateOverride(i(), v)}
                  placeholder="Filter entries…"
                  invalid={!!override && !props.entryIdSet.has(override)}
                  errorMessage={!!override && !props.entryIdSet.has(override) ? 'Entry not found' : undefined}
                />
              </div>
              <button class="btn" onClick={() => removeOverride(i())}>
                Remove
              </button>
            </div>
          )}
        </For>
        <div class="list-toolbar">
          <div style={{ flex: '1' }}>
            <FilteredSelect
              options={props.allEntryIds}
              value={newOverride()}
              onChange={setNewOverride}
              placeholder="Select entry to add as override…"
            />
          </div>
          <button class="btn btn-primary" onClick={addOverride}>
            Add
          </button>
        </div>
      </CollapsibleSection>

      <button class="btn" style={{ color: '#e74c3c' }} onClick={props.onDelete}>
        Delete Entry
      </button>
    </div>
  )
}

// --- Main page ---

export default function AppearanceConfigPage(): JSX.Element {
  const navigate = useNavigate()

  const [config, setConfig] = createSignal<AppearanceConfig>({
    appearanceClasses: [],
    appearance: []
  })
  const [status, setStatus] = createSignal('')
  const [errorList, setErrorList] = createSignal<ValidationError[]>([])

  const [classFilter, setClassFilter] = createSignal('')
  const [selectedClassPath, setSelectedClassPath] = createSignal<number[] | null>(null)

  const [entryFilter, setEntryFilter] = createSignal('')
  const [entryClassFilter, setEntryClassFilter] = createSignal('')
  const [selectedEntryIdx, setSelectedEntryIdx] = createSignal<number | null>(null)

  const flatClassList = createMemo(() => flattenClasses(config().appearanceClasses))
  const allClassNames = createMemo(() => flatClassList().map((n) => n.class))
  const classNameSet = createMemo(() => new Set(allClassNames()))
  const entryIdSet = createMemo(() => new Set(config().appearance.map((e) => e.id)))

  const duplicateClassNames = createMemo((): Set<string> => {
    const counts = new Map<string, number>()
    for (const name of allClassNames()) counts.set(name, (counts.get(name) ?? 0) + 1)
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n))
  })

  const duplicateEntryIds = createMemo((): Set<string> => {
    const counts = new Map<string, number>()
    for (const id of config().appearance.map((e) => e.id)) counts.set(id, (counts.get(id) ?? 0) + 1)
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n))
  })

  const collectErrors = (): ValidationError[] => {
    const errs: ValidationError[] = []
    for (const n of flatClassList()) {
      if (!n.class) errs.push({ message: `Class at "${n.displayLabel}": name is required`, classPath: n.path })
      else if (duplicateClassNames().has(n.class))
        errs.push({ message: `Class "${n.class}": name already exists`, classPath: n.path })
    }
    config().appearance.forEach((e, idx) => {
      const label = e.id || `#${idx + 1}`
      if (!e.id) errs.push({ message: `Entry #${idx + 1}: ID is required`, entryIdx: idx })
      else if (duplicateEntryIds().has(e.id))
        errs.push({ message: `Entry "${e.id}": ID already exists`, entryIdx: idx })
      e.items?.forEach((it, k) => {
        if (it.class && !classNameSet().has(it.class))
          errs.push({ message: `Entry "${label}" → item ${k + 1}: class "${it.class}" not found`, entryIdx: idx })
      })
      e.overrides?.forEach((o, k) => {
        if (o && !entryIdSet().has(o))
          errs.push({ message: `Entry "${label}" → override ${k + 1}: entry "${o}" not found`, entryIdx: idx })
      })
    })
    return errs
  }

  const filteredClasses = createMemo(() => {
    const q = classFilter().trim().toLowerCase()
    return q ? flatClassList().filter((n) => n.class.toLowerCase().includes(q)) : flatClassList()
  })

  const filteredEntries = createMemo(() => {
    let list = config().appearance
    const q = entryFilter().trim().toLowerCase()
    if (q) list = list.filter((e) => e.id.toLowerCase().includes(q))
    const cls = entryClassFilter().trim().toLowerCase()
    if (cls) list = list.filter((e) => e.items?.some((i) => i.class?.toLowerCase().includes(cls)))
    return list
  })

  const selectedClass = createMemo(() =>
    resolveClassByPath(config().appearanceClasses, selectedClassPath())
  )

  const selectedEntry = createMemo(() => {
    const idx = selectedEntryIdx()
    return idx !== null ? (config().appearance[idx] ?? null) : null
  })

  onMount(async () => {
    try {
      const raw = await window.electronAPI.saveData.read('configs/appearance.json')
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppearanceConfig>
        setConfig({
          appearanceClasses: parsed.appearanceClasses ?? [],
          appearance: parsed.appearance ?? []
        })
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
        'configs/appearance.json',
        JSON.stringify(config(), null, 2)
      )
      setStatus('Saved')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus(String(err))
    }
  }

  const goToError = (e: ValidationError): void => {
    if (e.entryIdx !== undefined) {
      setEntryFilter('')
      setEntryClassFilter('')
      setSelectedEntryIdx(e.entryIdx)
    }
    if (e.classPath) {
      setClassFilter('')
      setSelectedClassPath(e.classPath)
    }
    setErrorList([])
  }

  // --- Class mutations ---

  const addTopLevelClass = (): void => {
    setConfig((c) => ({ ...c, appearanceClasses: [...c.appearanceClasses, { class: uniqueId('new-class', classNameSet()) }] }))
    setSelectedClassPath([config().appearanceClasses.length - 1])
  }

  const updateSelectedClassName = (name: string): void => {
    const path = selectedClassPath()
    if (!path) return
    setConfig((c) => ({
      ...c,
      appearanceClasses: updateClassAtPath(c.appearanceClasses, path, (n) => ({ ...n, class: name }))
    }))
  }

  const addSubClassToSelected = (): void => {
    const path = selectedClassPath()
    if (!path) return
    setConfig((c) => ({
      ...c,
      appearanceClasses: addSubClassAt(c.appearanceClasses, path, { class: uniqueId('new-class', classNameSet()) })
    }))
  }

  const removeSubClassFromSelected = (subIdx: number): void => {
    const path = selectedClassPath()
    if (!path) return
    setConfig((c) => ({
      ...c,
      appearanceClasses: deleteClassAtPath(c.appearanceClasses, [...path, subIdx])
    }))
  }

  const deleteSelectedClass = (): void => {
    const path = selectedClassPath()
    if (!path) return
    setConfig((c) => ({ ...c, appearanceClasses: deleteClassAtPath(c.appearanceClasses, path) }))
    setSelectedClassPath(null)
  }

  // --- Entry mutations ---

  const addEntry = (): void => {
    setConfig((c) => ({ ...c, appearance: [...c.appearance, { id: uniqueId('new-entry', entryIdSet()) }] }))
    setSelectedEntryIdx(config().appearance.length - 1)
  }

  const updateEntry = (updated: AppearanceEntryConfig): void => {
    const idx = selectedEntryIdx()
    if (idx === null) return
    setConfig((c) => {
      const appearance = [...c.appearance]
      appearance[idx] = updated
      return { ...c, appearance }
    })
  }

  const deleteEntry = (): void => {
    const idx = selectedEntryIdx()
    if (idx === null) return
    setConfig((c) => ({ ...c, appearance: c.appearance.filter((_, i) => i !== idx) }))
    setSelectedEntryIdx(null)
  }

  return (
    <div class="list-page">
      <FixedTopBar title="Appearance Config" onBack={() => navigate(-1)} />

      <div class="list-area">
        <CollapsibleSection title="Appearance Classes" defaultOpen={false}>
          <div class="list-toolbar">
            <SearchBar
              value={classFilter()}
              onInput={setClassFilter}
              placeholder="Filter by class name…"
            />
            <button class="btn btn-primary" onClick={addTopLevelClass}>
              + Add Class
            </button>
          </div>

          <For each={filteredClasses()}>
            {(node) => (
              <div
                class="list-row"
                classList={{ 'list-row-selected': pathsEqual(selectedClassPath(), node.path) }}
                style={{ 'padding-left': `${16 + node.depth * 16}px` }}
                onClick={() => setSelectedClassPath(node.path)}
              >
                <div class="list-row-info">
                  <span class="list-row-name">{node.class}</span>
                  <Show when={node.depth > 0}>
                    <span class="list-row-desc">{node.displayLabel}</span>
                  </Show>
                </div>
              </div>
            )}
          </For>

        </CollapsibleSection>

        <CollapsibleSection title="Appearance Entries" defaultOpen={false}>
          <div class="list-toolbar">
            <SearchBar
              value={entryFilter()}
              onInput={setEntryFilter}
              placeholder="Filter by entry ID…"
            />
            <div style={{ 'min-width': '220px' }}>
              <FilteredSelect
                options={allClassNames()}
                value={entryClassFilter()}
                onChange={setEntryClassFilter}
                placeholder="Filter entries by class…"
              />
            </div>
            <button class="btn btn-primary" onClick={addEntry}>
              + Add Entry
            </button>
          </div>

          <For each={filteredEntries()}>
            {(entry) => {
              const realIdx = () => config().appearance.indexOf(entry)
              return (
                <div
                  class="list-row"
                  classList={{ 'list-row-selected': selectedEntryIdx() === realIdx() }}
                  onClick={() => setSelectedEntryIdx(realIdx())}
                >
                  <div class="list-row-info">
                    <span class="list-row-name">{entry.id}</span>
                    <span class="list-row-desc">
                      {entry.items?.length ?? 0} item(s) · {entry.overrides?.length ?? 0} override(s)
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

      <Show when={selectedClass()}>
        {(node) => (
          <div class="modal-overlay" onClick={() => setSelectedClassPath(null)}>
            <div class="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Edit Class</h2>
              <div style={{ 'max-height': '70vh', 'overflow-y': 'auto' }}>
                <ClassEditor
                  node={node()}
                  duplicateClassNames={duplicateClassNames()}
                  onUpdateName={updateSelectedClassName}
                  onAddSubClass={addSubClassToSelected}
                  onRemoveSubClass={removeSubClassFromSelected}
                  onDelete={deleteSelectedClass}
                />
              </div>
              <div class="modal-actions">
                <button class="btn" onClick={() => setSelectedClassPath(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>

      <Show when={selectedEntry()}>
        {(entry) => (
          <div class="modal-overlay" onClick={() => setSelectedEntryIdx(null)}>
            <div class="modal" style={{ width: 'min(680px, 95vw)' }} onClick={(e) => e.stopPropagation()}>
              <h2>Edit Entry</h2>
              <div style={{ 'max-height': '70vh', 'overflow-y': 'auto' }}>
                <EntryEditor
                  entry={entry()}
                  classNameSet={classNameSet()}
                  entryIdSet={entryIdSet()}
                  duplicateEntryIds={duplicateEntryIds()}
                  allClassNames={allClassNames()}
                  allEntryIds={[...entryIdSet()]}
                  onUpdate={updateEntry}
                  onDelete={deleteEntry}
                />
              </div>
              <div class="modal-actions">
                <button class="btn" onClick={() => setSelectedEntryIdx(null)}>
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
