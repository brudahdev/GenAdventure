import { createMemo, createSignal, For, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import type { AppearanceClassConfig, PoseConfig } from '@gen-adventure/shared'
import CollapsibleSection from '../components/CollapsibleSection'
import FixedBottomBar from '../components/FixedBottomBar'
import FixedTopBar from '../components/FixedTopBar'
import MultiRefSelect from '../components/MultiRefSelect'
import SearchBar from '../components/SearchBar'
import StringListEditor from '../components/StringListEditor'

interface ValidationError {
  message: string
  poseIdx: number
}

function flattenClassNames(nodes: AppearanceClassConfig[]): string[] {
  const out: string[] = []
  for (const node of nodes) {
    out.push(node.class)
    if (node.subClasses?.length) out.push(...flattenClassNames(node.subClasses))
  }
  return out
}

function uniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  let n = 1
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export default function PoseConfigPage(): JSX.Element {
  const navigate = useNavigate()

  const [poses, setPoses] = createSignal<PoseConfig[]>([])
  const [appearanceClassNames, setAppearanceClassNames] = createSignal<string[]>([])
  const [status, setStatus] = createSignal('')
  const [errorList, setErrorList] = createSignal<ValidationError[]>([])
  const [poseFilter, setPoseFilter] = createSignal('')
  const [selectedPoseIdx, setSelectedPoseIdx] = createSignal<number | null>(null)

  const allPoseIds = createMemo(() => poses().map((p) => p.id))
  const poseIdSet = createMemo(() => new Set(allPoseIds()))
  const appearanceClassSet = createMemo(() => new Set(appearanceClassNames()))

  const duplicatePoseIds = createMemo((): Set<string> => {
    const counts = new Map<string, number>()
    for (const id of allPoseIds()) counts.set(id, (counts.get(id) ?? 0) + 1)
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n))
  })

  const collectErrors = (): ValidationError[] => {
    const errs: ValidationError[] = []
    poses().forEach((pose, idx) => {
      const label = pose.id || `#${idx + 1}`
      if (!pose.id) errs.push({ message: `Pose #${idx + 1}: ID is required`, poseIdx: idx })
      else if (duplicatePoseIds().has(pose.id))
        errs.push({ message: `Pose "${pose.id}": ID already exists`, poseIdx: idx })
      pose.occludedAppearanceClasses?.forEach((c) => {
        if (c && !appearanceClassSet().has(c))
          errs.push({ message: `Pose "${label}": class "${c}" not found`, poseIdx: idx })
      })
    })
    return errs
  }

  const filteredPoses = createMemo(() => {
    const q = poseFilter().trim().toLowerCase()
    if (!q) return poses()
    return poses().filter((p) => p.id.toLowerCase().includes(q))
  })

  const selectedPose = createMemo(() => {
    const idx = selectedPoseIdx()
    return idx !== null ? (poses()[idx] ?? null) : null
  })

  onMount(async () => {
    try {
      const raw = await window.electronAPI.saveData.read('configs/poses.json')
      if (raw) {
        const parsed = JSON.parse(raw) as PoseConfig[]
        if (Array.isArray(parsed)) setPoses(parsed)
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
  })

  const save = async (): Promise<void> => {
    const errs = collectErrors()
    if (errs.length > 0) {
      setErrorList(errs)
      return
    }
    setErrorList([])
    try {
      await window.electronAPI.saveData.write('configs/poses.json', JSON.stringify(poses(), null, 2))
      setStatus('Saved')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus(String(err))
    }
  }

  const goToError = (e: ValidationError): void => {
    setPoseFilter('')
    setSelectedPoseIdx(e.poseIdx)
    setErrorList([])
  }

  const addPose = (): void => {
    setPoses((arr) => [
      ...arr,
      { id: uniqueId('new-pose', poseIdSet()), tags: [] }
    ])
    setSelectedPoseIdx(poses().length - 1)
  }

  const updatePose = (updated: PoseConfig): void => {
    const idx = selectedPoseIdx()
    if (idx === null) return
    setPoses((arr) => arr.map((p, i) => (i === idx ? updated : p)))
  }

  const deletePose = (): void => {
    const idx = selectedPoseIdx()
    if (idx === null) return
    setPoses((arr) => arr.filter((_, i) => i !== idx))
    setSelectedPoseIdx(null)
  }

  const patch = (p: Partial<PoseConfig>): void => {
    const pose = selectedPose()
    if (!pose) return
    updatePose({ ...pose, ...p })
  }

  return (
    <div class="list-page">
      <FixedTopBar title="Pose Config" onBack={() => navigate(-1)} />

      <div class="list-area">
        <CollapsibleSection title="Poses" defaultOpen={true}>
          <div class="list-toolbar">
            <SearchBar
              value={poseFilter()}
              onInput={setPoseFilter}
              placeholder="Filter by ID…"
            />
            <button class="btn btn-primary" onClick={addPose}>
              + Add Pose
            </button>
          </div>

          <For each={filteredPoses()}>
            {(pose) => {
              const realIdx = (): number => poses().indexOf(pose)
              return (
                <div
                  class="list-row"
                  classList={{ 'list-row-selected': selectedPoseIdx() === realIdx() }}
                  onClick={() => setSelectedPoseIdx(realIdx())}
                >
                  <div class="list-row-info">
                    <span class="list-row-name">{pose.id || '(no id)'}</span>
                    <span class="list-row-desc">
                      {pose.tags?.length ?? 0} tag(s) ·{' '}
                      {pose.occludedAppearanceClasses?.length ?? 0} occluded class(es)
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

      <Show when={selectedPose()}>
        {(pose) => {
          const idError = (): string | null => {
            if (!pose().id) return 'ID is required'
            if (duplicatePoseIds().has(pose().id)) return 'ID already exists'
            return null
          }
          return (
            <div class="modal-overlay" onClick={() => setSelectedPoseIdx(null)}>
              <div class="modal" style={{ width: 'min(520px, 95vw)' }} onClick={(e) => e.stopPropagation()}>
                <h2>Edit Pose</h2>
                <div style={{ 'max-height': '70vh', 'overflow-y': 'auto' }}>
                  <div class="field">
                    <label class="field-label">ID</label>
                    <input
                      class="field-input"
                      classList={{ 'field-invalid': !!idError() }}
                      type="text"
                      value={pose().id}
                      onInput={(e) => patch({ id: e.currentTarget.value })}
                    />
                    <Show when={idError()}>
                      <span class="field-error">{idError()}</span>
                    </Show>
                  </div>

                  <StringListEditor
                    label="TAGS"
                    values={pose().tags ?? []}
                    onChange={(tags) => patch({ tags })}
                    placeholder="Add tag…"
                  />
                  <StringListEditor
                    label="EXCLUDE TAGS"
                    values={pose().excludeTags ?? []}
                    onChange={(excludeTags) => patch({ excludeTags: excludeTags.length ? excludeTags : undefined })}
                    placeholder="Add exclude tag…"
                  />

                  <div class="field">
                    <label class="field-label">OCCLUDED APPEARANCE CLASSES</label>
                    <MultiRefSelect
                      values={pose().occludedAppearanceClasses ?? []}
                      options={appearanceClassNames()}
                      optionSet={appearanceClassSet()}
                      onChange={(v) => patch({ occludedAppearanceClasses: v.length ? v : undefined })}
                      placeholder="Filter classes…"
                    />
                  </div>

                  <button class="btn" style={{ color: '#e74c3c', 'margin-top': '12px' }} onClick={deletePose}>
                    Delete Pose
                  </button>
                </div>
                <div class="modal-actions">
                  <button class="btn" onClick={() => setSelectedPoseIdx(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )
        }}
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
