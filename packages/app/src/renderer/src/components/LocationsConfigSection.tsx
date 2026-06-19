import { createMemo, createSignal, For, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import type {
  LocationConfig,
  LocationPoseConfig,
  PoseConfig,
  SubLocation
} from '@gen-adventure/shared'
import CollapsibleSection from './CollapsibleSection'
import FilteredSelect from './FilteredSelect'
import SearchBar from './SearchBar'
import StringListEditor from './StringListEditor'

// --- Helper types ---

interface ValidationError {
  message: string
  locationId: string
}

// --- Pure helpers ---

function uniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  let n = 1
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/** First sub-location id of a location, or '' when it has none. */
function firstSubId(loc: LocationConfig | undefined): string {
  return loc?.subLocations[0]?.id ?? ''
}

const DEFAULT_STAND_POSE: LocationPoseConfig = { poseId: 'stand', context: 'standing', img_txt: 'standing' }
const DEFAULT_SUB: SubLocation = { id: 'default-sublocation', onEnterText: '', poses: [DEFAULT_STAND_POSE], tags: [] }

// --- Section component ---

/**
 * Locations editor for a scenario: persists to
 * `configs/scenarios/<scenarioId>/locations.json` as a `LocationConfig[]`.
 *
 * Uses `createStore` so that fine-grained property updates don't replace item
 * references in the array — this keeps `<For>` from remounting items on every
 * keystroke, which would destroy input focus and reset CollapsibleSection state.
 */
export default function LocationsConfigSection(props: { scenarioId: string }): JSX.Element {
  const path = (): string => `configs/scenarios/${props.scenarioId}/locations.json`

  const [locations, setLocations] = createStore<LocationConfig[]>([])
  const [poseIds, setPoseIds] = createSignal<string[]>([])
  const [filter, setFilter] = createSignal('')
  const [status, setStatus] = createSignal('')
  const [errorList, setErrorList] = createSignal<ValidationError[]>([])

  const allLocationIds = createMemo(() => locations.map((l) => l.id))
  const locationIdSet = createMemo(() => new Set(allLocationIds()))
  const poseIdSet = createMemo(() => new Set(poseIds()))

  const duplicateLocationIds = createMemo((): Set<string> => {
    const counts = new Map<string, number>()
    for (const id of allLocationIds()) counts.set(id, (counts.get(id) ?? 0) + 1)
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n))
  })

  const filteredLocations = createMemo(() => {
    const q = filter().trim().toLowerCase()
    if (!q) return locations
    return locations.filter(
      (l) =>
        l.id.toLowerCase().includes(q) ||
        l.subLocations.some((s) => s.id.toLowerCase().includes(q))
    )
  })

  onMount(async () => {
    try {
      const raw = await window.electronAPI.saveData.read(path())
      if (raw) {
        const parsed = JSON.parse(raw) as LocationConfig[]
        if (Array.isArray(parsed)) setLocations(parsed)
      }
    } catch {
      // missing or malformed file — leave defaults
    }
    try {
      const raw = await window.electronAPI.saveData.read('configs/poses.json')
      if (raw) {
        const parsed = JSON.parse(raw) as PoseConfig[]
        if (Array.isArray(parsed)) setPoseIds(parsed.map((p) => p.id).filter(Boolean))
      }
    } catch {
      // ignore
    }
  })

  // --- Location mutations ---

  const updateLocationAt = (idx: number, patch: Partial<LocationConfig>): void => {
    setLocations(produce((d) => { Object.assign(d[idx], patch) }))
  }

  const addLocation = (): void => {
    setLocations(produce((d) => {
      d.push({
        id: uniqueId('new-location', locationIdSet()),
        onEnterText: '',
        context: '',
        connectedLocations: [],
        subLocations: [{ ...DEFAULT_SUB, poses: [{ ...DEFAULT_STAND_POSE }] }],
        tags: []
      })
    }))
  }

  const deleteLocation = (idx: number): void => {
    setLocations(produce((d) => {
      const removedId = d[idx]?.id
      d.splice(idx, 1)
      if (removedId) {
        for (const loc of d) {
          loc.connectedLocations = loc.connectedLocations.filter(
            (lk) => lk.locationId !== removedId
          )
        }
      }
    }))
  }

  // --- Sub-location mutations ---

  const updateSub = (aIdx: number, sIdx: number, patch: Partial<SubLocation>): void => {
    setLocations(produce((d) => { Object.assign(d[aIdx].subLocations[sIdx], patch) }))
  }

  const addSub = (aIdx: number): void => {
    setLocations(produce((d) => {
      const existing = new Set(d[aIdx].subLocations.map((s) => s.id))
      d[aIdx].subLocations.push({
        id: uniqueId('new-sublocation', existing),
        onEnterText: '',
        poses: [{ ...DEFAULT_STAND_POSE }],
        tags: []
      })
    }))
  }

  const removeSub = (aIdx: number, sIdx: number): void => {
    setLocations(produce((d) => { d[aIdx].subLocations.splice(sIdx, 1) }))
  }

  // --- Pose mutations (within a sub-location) ---

  const updatePose = (
    aIdx: number,
    sIdx: number,
    pIdx: number,
    patch: Partial<LocationPoseConfig>
  ): void => {
    setLocations(produce((d) => { Object.assign(d[aIdx].subLocations[sIdx].poses[pIdx], patch) }))
  }

  const addPose = (aIdx: number, sIdx: number): void => {
    setLocations(produce((d) => {
      d[aIdx].subLocations[sIdx].poses.push({ poseId: '', context: '', img_txt: '' })
    }))
  }

  const removePose = (aIdx: number, sIdx: number, pIdx: number): void => {
    setLocations(produce((d) => { d[aIdx].subLocations[sIdx].poses.splice(pIdx, 1) }))
  }

  // --- Link mutations (kept bidirectional) ---

  const addLink = (aIdx: number): void => {
    setLocations(produce((d) => {
      d[aIdx].connectedLocations.push({ locationId: '', defaultSubLocationId: '', distance: 0 })
    }))
  }

  const setLinkTarget = (aIdx: number, linkIdx: number, newTargetId: string): void => {
    setLocations(produce((d) => {
      const aLoc = d[aIdx]
      const aId = aLoc.id
      const old = aLoc.connectedLocations[linkIdx]
      const oldTargetId = old?.locationId ?? ''
      const dist = old?.distance ?? 0
      const targetLoc = d.find((l) => l.id === newTargetId)

      // Update A's link
      Object.assign(aLoc.connectedLocations[linkIdx], {
        locationId: newTargetId,
        defaultSubLocationId: firstSubId(targetLoc as LocationConfig | undefined),
        distance: dist
      })

      // Drop old reciprocal if A no longer links to old target at all
      if (oldTargetId && oldTargetId !== newTargetId) {
        const aStill = aLoc.connectedLocations.some((lk) => lk.locationId === oldTargetId)
        if (!aStill) {
          const oldTarget = d.find((l) => l.id === oldTargetId)
          if (oldTarget) {
            oldTarget.connectedLocations = oldTarget.connectedLocations.filter(
              (x) => x.locationId !== aId
            )
          }
        }
      }

      // Ensure reciprocal on new target (create or sync distance)
      if (newTargetId && newTargetId !== aId) {
        const newTarget = d.find((l) => l.id === newTargetId)
        if (newTarget) {
          const reciprocal = newTarget.connectedLocations.find((x) => x.locationId === aId)
          if (reciprocal) {
            reciprocal.distance = dist
          } else {
            newTarget.connectedLocations.push({
              locationId: aId,
              defaultSubLocationId: firstSubId(aLoc as LocationConfig | undefined),
              distance: dist
            })
          }
        }
      }
    }))
  }

  const setLinkDistance = (aIdx: number, linkIdx: number, distance: number): void => {
    setLocations(produce((d) => {
      const aLoc = d[aIdx]
      const aId = aLoc.id
      const targetId = aLoc.connectedLocations[linkIdx]?.locationId ?? ''
      aLoc.connectedLocations[linkIdx].distance = distance
      if (targetId) {
        const target = d.find((l) => l.id === targetId)
        if (target) {
          const reciprocal = target.connectedLocations.find((x) => x.locationId === aId)
          if (reciprocal) reciprocal.distance = distance
        }
      }
    }))
  }

  const setLinkDefaultSub = (aIdx: number, linkIdx: number, subId: string): void => {
    setLocations(produce((d) => {
      d[aIdx].connectedLocations[linkIdx].defaultSubLocationId = subId
    }))
  }

  const removeLink = (aIdx: number, linkIdx: number): void => {
    setLocations(produce((d) => {
      const aLoc = d[aIdx]
      const aId = aLoc.id
      const targetId = aLoc.connectedLocations[linkIdx]?.locationId ?? ''
      aLoc.connectedLocations.splice(linkIdx, 1)
      if (targetId) {
        const aStill = aLoc.connectedLocations.some((lk) => lk.locationId === targetId)
        if (!aStill) {
          const target = d.find((l) => l.id === targetId)
          if (target) {
            target.connectedLocations = target.connectedLocations.filter(
              (x) => x.locationId !== aId
            )
          }
        }
      }
    }))
  }

  // --- Copy helpers ---

  const moveSub = (aIdx: number, sIdx: number, targetLocationId: string): void => {
    if (!targetLocationId) return
    setLocations(produce((d) => {
      const [sub] = d[aIdx].subLocations.splice(sIdx, 1)
      const target = d.find((l) => l.id === targetLocationId)
      target?.subLocations.push(sub)
    }))
  }

  const copyLocation = (idx: number): void => {
    setLocations(produce((d) => {
      const copy: LocationConfig = JSON.parse(JSON.stringify(d[idx]))
      copy.id = uniqueId(copy.id + '-copy', new Set(d.map((l) => l.id)))
      copy.connectedLocations = []
      d.push(copy)
    }))
  }

  const copySub = (aIdx: number, sIdx: number): void => {
    setLocations(produce((d) => {
      const copy: SubLocation = JSON.parse(JSON.stringify(d[aIdx].subLocations[sIdx]))
      const existingIds = new Set(d[aIdx].subLocations.map((s) => s.id))
      copy.id = uniqueId(copy.id + '-copy', existingIds)
      d[aIdx].subLocations.push(copy)
    }))
  }

  // --- Validation ---

  const collectErrors = (): ValidationError[] => {
    const errs: ValidationError[] = []
    locations.forEach((loc, idx) => {
      const label = loc.id || `#${idx + 1}`
      if (!loc.id) errs.push({ message: `Location #${idx + 1}: ID is required`, locationId: loc.id })
      else if (duplicateLocationIds().has(loc.id))
        errs.push({ message: `Location "${loc.id}": ID already exists`, locationId: loc.id })

      if (loc.subLocations.length === 0)
        errs.push({ message: `Location "${label}": must have at least one sub-location`, locationId: loc.id })

      if (!loc.tags?.length)
        errs.push({ message: `Location "${label}": must have at least one tag`, locationId: loc.id })

      // Sub-locations
      const subIdCounts = new Map<string, number>()
      for (const s of loc.subLocations) subIdCounts.set(s.id, (subIdCounts.get(s.id) ?? 0) + 1)
      loc.subLocations.forEach((sub, sIdx) => {
        const sLabel = sub.id || `#${sIdx + 1}`
        if (!sub.id)
          errs.push({ message: `Location "${label}" → sub-location #${sIdx + 1}: ID is required`, locationId: loc.id })
        else if ((subIdCounts.get(sub.id) ?? 0) > 1)
          errs.push({ message: `Location "${label}" → sub-location "${sub.id}": ID is duplicated`, locationId: loc.id })

        if (!sub.tags?.length)
          errs.push({ message: `Location "${label}" → sub-location "${sLabel}": must have at least one tag`, locationId: loc.id })

        if (!sub.poses.some((p) => p.poseId === 'stand'))
          errs.push({ message: `Location "${label}" → sub-location "${sLabel}": must define a "stand" pose`, locationId: loc.id })

        sub.poses.forEach((pose, pIdx) => {
          if (!pose.poseId)
            errs.push({ message: `Location "${label}" → sub "${sLabel}" → pose #${pIdx + 1}: pose is required`, locationId: loc.id })
          else if (!poseIdSet().has(pose.poseId))
            errs.push({ message: `Location "${label}" → sub "${sLabel}" → pose "${pose.poseId}" not found`, locationId: loc.id })
          if (!pose.context)
            errs.push({ message: `Location "${label}" → sub "${sLabel}" → pose "${pose.poseId || `#${pIdx + 1}`}": context is required`, locationId: loc.id })
          if (!pose.img_txt)
            errs.push({ message: `Location "${label}" → sub "${sLabel}" → pose "${pose.poseId || `#${pIdx + 1}`}": prompt text is required`, locationId: loc.id })
        })
      })

      // Links
      loc.connectedLocations.forEach((lk, lIdx) => {
        if (!lk.locationId)
          errs.push({ message: `Location "${label}" → link #${lIdx + 1}: target is required`, locationId: loc.id })
        else if (lk.locationId === loc.id)
          errs.push({ message: `Location "${label}" → link #${lIdx + 1}: cannot link to itself`, locationId: loc.id })
        else if (!locationIdSet().has(lk.locationId))
          errs.push({ message: `Location "${label}" → link "${lk.locationId}" not found`, locationId: loc.id })
        else {
          const target = locations.find((l) => l.id === lk.locationId)
          if (
            lk.defaultSubLocationId &&
            !target?.subLocations.some((s) => s.id === lk.defaultSubLocationId)
          )
            errs.push({ message: `Location "${label}" → link "${lk.locationId}": sub-location "${lk.defaultSubLocationId}" not found`, locationId: loc.id })
        }
        if (!Number.isFinite(lk.distance) || lk.distance < 0)
          errs.push({ message: `Location "${label}" → link "${lk.locationId || `#${lIdx + 1}`}": distance must be ≥ 0`, locationId: loc.id })
      })
    })
    return errs
  }

  const save = async (): Promise<void> => {
    const errs = collectErrors()
    if (errs.length > 0) {
      setErrorList(errs)
      return
    }
    setErrorList([])
    try {
      await window.electronAPI.saveData.write(path(), JSON.stringify(locations, null, 2))
      setStatus('Saved')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus(String(err))
    }
  }

  const goToError = (e: ValidationError): void => {
    setFilter(e.locationId)
    setErrorList([])
  }

  return (
    <>
      <div class="list-toolbar">
        <SearchBar
          value={filter()}
          onInput={setFilter}
          placeholder="Filter by location or sub-location ID…"
        />
        <button class="btn btn-primary" onClick={addLocation}>
          + Add Location
        </button>
      </div>

      <For each={filteredLocations()}>
        {(loc) => {
          const idx = (): number => locations.indexOf(loc)
          const idError = (): string | null => {
            if (!loc.id) return 'ID is required'
            if (duplicateLocationIds().has(loc.id)) return 'ID already exists'
            return null
          }
          const otherLocationIds = (): string[] =>
            allLocationIds().filter((id) => id !== loc.id)

          return (
            <CollapsibleSection title={loc.id || '(no id)'} defaultOpen={false}>
              <div class="field">
                <label class="field-label">LOCATION ID</label>
                <input
                  class="field-input"
                  classList={{ 'field-invalid': !!idError() }}
                  type="text"
                  value={loc.id}
                  onInput={(e) => updateLocationAt(idx(), { id: e.currentTarget.value })}
                />
                <Show when={idError()}>
                  <span class="field-error">{idError()}</span>
                </Show>
              </div>

              <div class="field">
                <label class="field-label">ON ENTER TEXT</label>
                <textarea
                  class="field-input"
                  rows={2}
                  value={loc.onEnterText}
                  onInput={(e) => updateLocationAt(idx(), { onEnterText: e.currentTarget.value })}
                />
              </div>

              <div class="field">
                <label class="field-label">CONTEXT</label>
                <textarea
                  class="field-input"
                  rows={3}
                  value={loc.context}
                  onInput={(e) => updateLocationAt(idx(), { context: e.currentTarget.value })}
                />
              </div>

              <div class="field">
                <label class="field-label">AVATAR POSITIVE PROMPT</label>
                <input
                  class="field-input"
                  type="text"
                  value={loc.img_txt ?? ''}
                  onInput={(e) =>
                    updateLocationAt(idx(), { img_txt: e.currentTarget.value || undefined })
                  }
                />
              </div>

              <div class="field">
                <label class="field-label">AVATAR NEGATIVE PROMPT</label>
                <input
                  class="field-input"
                  type="text"
                  value={loc.img_txt_neg ?? ''}
                  onInput={(e) =>
                    updateLocationAt(idx(), { img_txt_neg: e.currentTarget.value || undefined })
                  }
                />
              </div>

              <div class="field">
                <label class="field-label">BACKGROUND POSITIVE PROMPT</label>
                <input
                  class="field-input"
                  type="text"
                  value={loc.background_img_txt ?? ''}
                  onInput={(e) =>
                    updateLocationAt(idx(), {
                      background_img_txt: e.currentTarget.value || undefined
                    })
                  }
                />
              </div>

              <div class="field">
                <label class="field-label">BACKGROUND NEGATIVE PROMPT</label>
                <input
                  class="field-input"
                  type="text"
                  value={loc.background_img_txt_neg ?? ''}
                  onInput={(e) =>
                    updateLocationAt(idx(), {
                      background_img_txt_neg: e.currentTarget.value || undefined
                    })
                  }
                />
              </div>

              <StringListEditor
                label="TAGS"
                values={loc.tags ?? []}
                onChange={(tags) => updateLocationAt(idx(), { tags })}
                placeholder="Add tag…"
              />
              <StringListEditor
                label="EXCLUDE TAGS"
                values={loc.excludeTags ?? []}
                onChange={(v) => updateLocationAt(idx(), { excludeTags: v.length ? v : undefined })}
                placeholder="Add exclude tag…"
              />

              <CollapsibleSection title="Connected Locations" defaultOpen={false}>
                <For each={loc.connectedLocations}>
                  {(link, lIdx) => {
                    const targetLoc = (): LocationConfig | undefined =>
                      locations.find((l) => l.id === link.locationId)
                    const targetSubIds = (): string[] =>
                      targetLoc()?.subLocations.map((s) => s.id) ?? []
                    return (
                      <div class="appearance-item-card">
                        <div class="appearance-item-header">
                          <span class="list-row-name">Link {lIdx() + 1}</span>
                          <button class="btn" onClick={() => removeLink(idx(), lIdx())}>
                            Remove
                          </button>
                        </div>
                        <div class="field">
                          <label class="field-label">TARGET LOCATION</label>
                          <FilteredSelect
                            options={otherLocationIds()}
                            value={link.locationId}
                            onChange={(v) => setLinkTarget(idx(), lIdx(), v)}
                            placeholder="Filter locations…"
                            invalid={!!link.locationId && !locationIdSet().has(link.locationId)}
                            errorMessage={
                              !link.locationId
                                ? 'Target is required'
                                : !locationIdSet().has(link.locationId)
                                  ? 'Location not found'
                                  : undefined
                            }
                          />
                        </div>
                        <div class="field">
                          <label class="field-label">DEFAULT SUB-LOCATION</label>
                          <FilteredSelect
                            options={targetSubIds()}
                            value={link.defaultSubLocationId}
                            onChange={(v) => setLinkDefaultSub(idx(), lIdx(), v)}
                            placeholder="Filter sub-locations…"
                            invalid={
                              !!link.defaultSubLocationId &&
                              !targetSubIds().includes(link.defaultSubLocationId)
                            }
                            errorMessage={
                              !!link.defaultSubLocationId &&
                              !targetSubIds().includes(link.defaultSubLocationId)
                                ? 'Sub-location not found'
                                : undefined
                            }
                          />
                        </div>
                        <div class="field">
                          <label class="field-label">DISTANCE (m)</label>
                          <input
                            class="field-input"
                            classList={{ 'field-invalid': !(link.distance >= 0) }}
                            type="number"
                            min="0"
                            value={link.distance}
                            onInput={(e) =>
                              setLinkDistance(idx(), lIdx(), Number(e.currentTarget.value))
                            }
                          />
                        </div>
                      </div>
                    )
                  }}
                </For>
                <button class="btn" onClick={() => addLink(idx())}>
                  + Add Link
                </button>
              </CollapsibleSection>

              <CollapsibleSection title="Sub-locations" defaultOpen={false}>
                <For each={loc.subLocations}>
                  {(sub, sIdx) => {
                    const [moveTarget, setMoveTarget] = createSignal('')
                    return (
                    <CollapsibleSection title={sub.id || '(no id)'} defaultOpen={false}>
                      <div class="field">
                        <label class="field-label">SUB-LOCATION ID</label>
                        <input
                          class="field-input"
                          classList={{ 'field-invalid': !sub.id }}
                          type="text"
                          value={sub.id}
                          onInput={(e) => updateSub(idx(), sIdx(), { id: e.currentTarget.value })}
                        />
                        <Show when={!sub.id}>
                          <span class="field-error">Sub-location ID is required</span>
                        </Show>
                      </div>

                      <div class="field">
                        <label class="field-label">ON ENTER TEXT</label>
                        <textarea
                          class="field-input"
                          rows={2}
                          value={sub.onEnterText}
                          onInput={(e) =>
                            updateSub(idx(), sIdx(), { onEnterText: e.currentTarget.value })
                          }
                        />
                      </div>

                      <div class="field">
                        <label class="field-label">PROMPT TEXT</label>
                        <input
                          class="field-input"
                          type="text"
                          value={sub.img_txt ?? ''}
                          onInput={(e) =>
                            updateSub(idx(), sIdx(), { img_txt: e.currentTarget.value || undefined })
                          }
                        />
                      </div>

                      <div class="field">
                        <label class="field-label">NEGATIVE PROMPT</label>
                        <input
                          class="field-input"
                          type="text"
                          value={sub.img_txt_neg ?? ''}
                          onInput={(e) =>
                            updateSub(idx(), sIdx(), {
                              img_txt_neg: e.currentTarget.value || undefined
                            })
                          }
                        />
                      </div>

                      <StringListEditor
                        label="TAGS"
                        values={sub.tags ?? []}
                        onChange={(tags) => updateSub(idx(), sIdx(), { tags })}
                        placeholder="Add tag…"
                      />
                      <StringListEditor
                        label="EXCLUDE TAGS"
                        values={sub.excludeTags ?? []}
                        onChange={(v) =>
                          updateSub(idx(), sIdx(), { excludeTags: v.length ? v : undefined })
                        }
                        placeholder="Add exclude tag…"
                      />

                      <CollapsibleSection title="Poses" defaultOpen={false}>
                        <For each={sub.poses}>
                          {(pose, pIdx) => (
                            <CollapsibleSection title={pose.poseId || '(no pose)'} defaultOpen={false}>
                              <div class="field">
                                <label class="field-label">POSE</label>
                                <FilteredSelect
                                  options={poseIds()}
                                  value={pose.poseId}
                                  onChange={(v) => updatePose(idx(), sIdx(), pIdx(), { poseId: v })}
                                  placeholder="Filter poses…"
                                  invalid={!!pose.poseId && !poseIdSet().has(pose.poseId)}
                                  errorMessage={
                                    !pose.poseId
                                      ? 'Pose is required'
                                      : !poseIdSet().has(pose.poseId)
                                        ? 'Pose not found'
                                        : undefined
                                  }
                                />
                              </div>
                              <div class="field">
                                <label class="field-label">CONTEXT</label>
                                <textarea
                                  class="field-input"
                                  classList={{ 'field-invalid': !pose.context }}
                                  rows={2}
                                  value={pose.context}
                                  onInput={(e) =>
                                    updatePose(idx(), sIdx(), pIdx(), { context: e.currentTarget.value })
                                  }
                                />
                                <Show when={!pose.context}>
                                  <span class="field-error">Context is required</span>
                                </Show>
                              </div>
                              <div class="field">
                                <label class="field-label">PROMPT TEXT</label>
                                <input
                                  class="field-input"
                                  classList={{ 'field-invalid': !pose.img_txt }}
                                  type="text"
                                  value={pose.img_txt}
                                  onInput={(e) =>
                                    updatePose(idx(), sIdx(), pIdx(), { img_txt: e.currentTarget.value })
                                  }
                                />
                                <Show when={!pose.img_txt}>
                                  <span class="field-error">Prompt text is required</span>
                                </Show>
                              </div>
                              <div class="field">
                                <label class="field-label">NEGATIVE PROMPT</label>
                                <input
                                  class="field-input"
                                  type="text"
                                  value={pose.img_txt_neg ?? ''}
                                  onInput={(e) =>
                                    updatePose(idx(), sIdx(), pIdx(), {
                                      img_txt_neg: e.currentTarget.value || undefined
                                    })
                                  }
                                />
                              </div>
                              <button
                                class="btn"
                                style={{ color: '#e74c3c', 'margin-top': '8px' }}
                                onClick={() => removePose(idx(), sIdx(), pIdx())}
                              >
                                Remove Pose
                              </button>
                            </CollapsibleSection>
                          )}
                        </For>
                        <button class="btn" onClick={() => addPose(idx(), sIdx())}>
                          + Add Pose
                        </button>
                      </CollapsibleSection>

                      <div class="list-toolbar" style={{ 'margin-top': '12px' }}>
                        <FilteredSelect
                          options={otherLocationIds()}
                          value={moveTarget()}
                          onChange={setMoveTarget}
                          placeholder="Move to location…"
                        />
                        <button
                          class="btn"
                          disabled={!moveTarget()}
                          onClick={() => { moveSub(idx(), sIdx(), moveTarget()); setMoveTarget('') }}
                        >
                          Move
                        </button>
                      </div>

                      <div class="list-toolbar" style={{ 'margin-top': '8px' }}>
                        <button class="btn" onClick={() => copySub(idx(), sIdx())}>
                          Copy Sub-location
                        </button>
                        <button
                          class="btn"
                          style={{ color: '#e74c3c' }}
                          onClick={() => removeSub(idx(), sIdx())}
                        >
                          Delete Sub-location
                        </button>
                      </div>
                    </CollapsibleSection>
                    )
                  }}
                </For>
                <button class="btn" onClick={() => addSub(idx())}>
                  + Add Sub-location
                </button>
              </CollapsibleSection>

              <div class="list-toolbar" style={{ 'margin-top': '12px' }}>
                <button class="btn" onClick={() => copyLocation(idx())}>
                  Copy Location
                </button>
                <button
                  class="btn"
                  style={{ color: '#e74c3c' }}
                  onClick={() => deleteLocation(idx())}
                >
                  Delete Location
                </button>
              </div>
            </CollapsibleSection>
          )
        }}
      </For>

      <div class="list-toolbar" style={{ 'margin-top': '12px' }}>
        <button class="btn btn-primary" onClick={save}>
          Save Locations
        </button>
        <Show when={status()}>
          <span style={{ color: status() === 'Saved' ? 'var(--text-muted)' : '#e74c3c' }}>
            {status()}
          </span>
        </Show>
      </div>

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
    </>
  )
}
