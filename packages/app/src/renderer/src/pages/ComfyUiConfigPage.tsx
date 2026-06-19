import { createMemo, createSignal, For, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import type {
  ComfyGenericSettings,
  WorkflowLeafOption,
  WorkflowVariableBindings
} from '@gen-adventure/shared'
import FixedTopBar from '../components/FixedTopBar'
import FixedBottomBar from '../components/FixedBottomBar'

/** The five variable bindings, with display labels, in render order. */
const BINDING_FIELDS: { key: keyof WorkflowVariableBindings; label: string }[] = [
  { key: 'positivePromptPath', label: 'POSITIVE PROMPT' },
  { key: 'negativePromptPath', label: 'NEGATIVE PROMPT' },
  { key: 'widthPath', label: 'WIDTH' },
  { key: 'heightPath', label: 'HEIGHT' },
  { key: 'seedPath', label: 'SEED' }
]

const EMPTY_BINDINGS: WorkflowVariableBindings = {
  positivePromptOverride: '',
  negativePromptOverride: '',
  positivePromptPath: '',
  negativePromptPath: '',
  widthPath: '',
  heightPath: '',
  seedPath: ''
}

/**
 * A labelled, searchable dropdown for picking a workflow JSONPath. The search box
 * filters the options by their displayed `"<path> (Default …)"` label; the select
 * holds the chosen path as its value.
 */
function BindingSelect(props: {
  label: string
  options: WorkflowLeafOption[]
  value: string
  onChange: (path: string) => void
}): JSX.Element {
  const [search, setSearch] = createSignal('')
  const filtered = createMemo(() => {
    const q = search().toLowerCase()
    return q ? props.options.filter((o) => o.label.toLowerCase().includes(q)) : props.options
  })

  return (
    <div class="field">
      <label class="field-label">{props.label}</label>
      <input
        class="field-input"
        type="text"
        placeholder="Filter variables…"
        value={search()}
        onInput={(e) => setSearch(e.currentTarget.value)}
      />
      <select
        class="field-input"
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
      >
        <option value="">— select variable —</option>
        {/* Keep the current value visible even if filtered out by the search. */}
        <Show when={props.value && !filtered().some((o) => o.path === props.value)}>
          <option value={props.value}>{props.value}</option>
        </Show>
        <For each={filtered()}>{(o) => <option value={o.path}>{o.label}</option>}</For>
      </select>
    </div>
  )
}

/**
 * ComfyUI provider config: generic settings, workflow import (native file dialog),
 * workflow selection, and the per-workflow JSONPath variable bindings. Saving
 * persists generic settings and bindings (the main process validates the paths).
 */
export default function ComfyUiConfigPage(): JSX.Element {
  const navigate = useNavigate()

  const [settings, setSettings] = createSignal<ComfyGenericSettings | null>(null)
  const [workflows, setWorkflows] = createSignal<string[]>([])
  const [paths, setPaths] = createSignal<WorkflowLeafOption[]>([])
  const [bindings, setBindings] = createSignal<WorkflowVariableBindings>(EMPTY_BINDINGS)
  const [status, setStatus] = createSignal('')

  onMount(async () => {
    const [loaded, list] = await Promise.all([
      window.electronAPI.comfy.getSettings(),
      window.electronAPI.comfy.listWorkflows()
    ])
    setSettings(loaded)
    setWorkflows(list)
    if (loaded.selectedWorkflow) await loadWorkflow(loaded.selectedWorkflow)
  })

  /** Load the leaf options + saved bindings for a workflow. */
  const loadWorkflow = async (key: string): Promise<void> => {
    const [opts, saved] = await Promise.all([
      window.electronAPI.comfy.getWorkflowPaths(key),
      window.electronAPI.comfy.getBindings(key)
    ])
    setPaths(opts)
    setBindings(saved)
  }

  const patchSettings = (patch: Partial<ComfyGenericSettings>): void => {
    const current = settings()
    if (current) setSettings({ ...current, ...patch })
  }

  const selectWorkflow = async (key: string): Promise<void> => {
    patchSettings({ selectedWorkflow: key })
    if (key) await loadWorkflow(key)
    else {
      setPaths([])
      setBindings(EMPTY_BINDINGS)
    }
  }

  const importWorkflow = async (): Promise<void> => {
    setStatus('')
    const { workflows: list, added } = await window.electronAPI.comfy.loadWorkflow()
    setWorkflows(list)
    if (added) await selectWorkflow(added)
  }

  const save = async (): Promise<void> => {
    const current = settings()
    if (!current) return
    setStatus('')
    try {
      await window.electronAPI.comfy.setSettings(current)
      if (current.selectedWorkflow) {
        await window.electronAPI.comfy.setBindings(current.selectedWorkflow, bindings())
      }
      setStatus('Saved')
    } catch (err) {
      setStatus(String(err))
    }
  }

  return (
    <div class="list-page">
      <FixedTopBar title="ComfyUI Config" onBack={() => navigate(-1)} />

      <div class="list-area">
        <Show when={settings()} fallback={<p>Loading…</p>}>
          {(s) => (
            <>
              <div class="field">
                <label class="field-label">SERVER URL</label>
                <input
                  class="field-input"
                  type="text"
                  value={s().url}
                  onInput={(e) => patchSettings({ url: e.currentTarget.value })}
                />
              </div>

              <div class="field">
                <label class="field-label">AVATAR TARGET PIXELS</label>
                <input
                  class="field-input"
                  type="number"
                  value={s().avatarTargetPixels}
                  onInput={(e) => patchSettings({ avatarTargetPixels: Number(e.currentTarget.value) })}
                />
              </div>

              <div class="field">
                <label class="field-label">BACKGROUND TARGET PIXELS</label>
                <input
                  class="field-input"
                  type="number"
                  value={s().backgroundTargetPixels}
                  onInput={(e) =>
                    patchSettings({ backgroundTargetPixels: Number(e.currentTarget.value) })
                  }
                />
              </div>

              <div class="field">
                <label class="field-label">SEED (-1 = random)</label>
                <input
                  class="field-input"
                  type="number"
                  value={s().seed}
                  onInput={(e) => patchSettings({ seed: Number(e.currentTarget.value) })}
                />
              </div>

              <label class="toggle-row">
                <input
                  type="checkbox"
                  checked={s().usePreviews}
                  onChange={(e) => patchSettings({ usePreviews: e.currentTarget.checked })}
                />
                <span>Use socket previews</span>
              </label>

              <div class="list-toolbar">
                <button class="btn" onClick={() => void importWorkflow()}>
                  Load Workflow
                </button>
              </div>

              <div class="field">
                <label class="field-label">WORKFLOW</label>
                <select
                  class="field-input"
                  value={s().selectedWorkflow}
                  onChange={(e) => void selectWorkflow(e.currentTarget.value)}
                >
                  <option value="">— select workflow —</option>
                  <For each={workflows()}>{(w) => <option value={w}>{w}</option>}</For>
                </select>
              </div>

              <Show when={s().selectedWorkflow}>
                <div class="field">
                  <label class="field-label">POSITIVE PROMPT OVERRIDE</label>
                  <input
                    class="field-input"
                    type="text"
                    value={bindings().positivePromptOverride}
                    onInput={(e) => setBindings({ ...bindings(), positivePromptOverride: e.currentTarget.value })}
                  />
                </div>

                <div class="field">
                  <label class="field-label">NEGATIVE PROMPT OVERRIDE</label>
                  <input
                    class="field-input"
                    type="text"
                    value={bindings().negativePromptOverride}
                    onInput={(e) => setBindings({ ...bindings(), negativePromptOverride: e.currentTarget.value })}
                  />
                </div>

                <For each={BINDING_FIELDS}>
                  {(field) => (
                    <BindingSelect
                      label={field.label}
                      options={paths()}
                      value={bindings()[field.key]}
                      onChange={(path) => setBindings({ ...bindings(), [field.key]: path })}
                    />
                  )}
                </For>
              </Show>
            </>
          )}
        </Show>
      </div>

      <FixedBottomBar>
        <Show when={status()}>
          <span class="comfy-status">{status()}</span>
        </Show>
        <button class="btn btn-primary" onClick={() => void save()}>
          Save
        </button>
      </FixedBottomBar>
    </div>
  )
}
