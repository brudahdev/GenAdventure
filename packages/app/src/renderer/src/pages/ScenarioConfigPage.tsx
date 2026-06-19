import { createMemo, createSignal, For, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate, useParams, useLocation } from '@solidjs/router'
import type {
  LocationConfig,
  OutfitConfig,
  PlayerConfig,
  RoleConfig,
  TimeConfig,
  VoxtaScenarioRole,
  VoxtaScenarioSummary
} from '@gen-adventure/shared'
import { PLAYER_ROLE_ORDER } from '@gen-adventure/shared'
import FixedTopBar from '../components/FixedTopBar'
import FixedBottomBar from '../components/FixedBottomBar'
import CollapsibleSection from '../components/CollapsibleSection'
import LocationsConfigSection from '../components/LocationsConfigSection'
import FilteredSelect from '../components/FilteredSelect'

const DEFAULT_TIME_CONFIG: TimeConfig = {
  useCurrentTime: true,
  am: true,
  minute: 0,
  hour: 8,
  day: 13,
  month: 12,
  year: 200
}

/**
 * Time settings for a scenario, persisted to its own flat file
 * `configs/scenarios/<scenarioId>/time.json` (a bare `TimeConfig`). Auto-saves
 * on every change.
 */
function TimeConfigSection(props: { scenarioId: string }): JSX.Element {
  const path = `configs/scenarios/${props.scenarioId}/time.json`
  const [config, setConfig] = createSignal<TimeConfig>(DEFAULT_TIME_CONFIG)

  onMount(async () => {
    const raw = await window.electronAPI.saveData.read(path)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Partial<TimeConfig>
      setConfig({ ...DEFAULT_TIME_CONFIG, ...parsed })
    } catch {
      // Keep defaults on a malformed file.
    }
  })

  /** Patch the in-memory config and persist the whole flat object. */
  const patch = async (partial: Partial<TimeConfig>): Promise<void> => {
    const next = { ...config(), ...partial }
    setConfig(next)
    await window.electronAPI.saveData.write(path, JSON.stringify(next, null, 2))
  }

  return (
    <>
      <label class="toggle-row">
        <input
          type="checkbox"
          checked={config().useCurrentTime}
          onChange={(e) => void patch({ useCurrentTime: e.currentTarget.checked })}
        />
        <span>Use current time</span>
      </label>

      <Show when={!config().useCurrentTime}>
        <div class="field">
          <label class="field-label">YEAR</label>
          <input
            class="field-input"
            type="number"
            value={config().year}
            onInput={(e) => void patch({ year: Number(e.currentTarget.value) })}
          />
        </div>

        <div class="field">
          <label class="field-label">MONTH</label>
          <input
            class="field-input"
            type="number"
            value={config().month}
            onInput={(e) => void patch({ month: Number(e.currentTarget.value) })}
          />
        </div>

        <div class="field">
          <label class="field-label">DAY</label>
          <input
            class="field-input"
            type="number"
            value={config().day}
            onInput={(e) => void patch({ day: Number(e.currentTarget.value) })}
          />
        </div>

        <div class="field">
          <label class="field-label">HOUR</label>
          <input
            class="field-input"
            type="number"
            value={config().hour}
            onInput={(e) => void patch({ hour: Number(e.currentTarget.value) })}
          />
        </div>

        <div class="field">
          <label class="field-label">MINUTE</label>
          <input
            class="field-input"
            type="number"
            value={config().minute}
            onInput={(e) => void patch({ minute: Number(e.currentTarget.value) })}
          />
        </div>

        <label class="toggle-row">
          <input
            type="radio"
            name="time-am-pm"
            checked={config().am}
            onChange={() => void patch({ am: true })}
          />
          <span>AM</span>
        </label>
        <label class="toggle-row">
          <input
            type="radio"
            name="time-am-pm"
            checked={!config().am}
            onChange={() => void patch({ am: false })}
          />
          <span>PM</span>
        </label>
      </Show>
    </>
  )
}


// A starting location references a sub-location, identified by the pair
// (top-level location id + sub-location id) and shown as `<loc>/<sub>`.
type SubLocationRef = { locationId: string; subLocationId: string }
const subLocationKey = (loc: string, sub: string): string => `${loc}/${sub}`

/**
 * The shared starting-state pickers (location / pose / outfit) for a single
 * `RoleConfig`. Used both for Voxta roles and for the player. `cfg` is a getter
 * so the fields stay reactive; `onPatch` merges a partial into that role.
 */
function RoleFields(props: {
  cfg: () => RoleConfig
  onPatch: (partial: Partial<RoleConfig>) => void
  subLocationKeys: string[]
  subLocationByKey: Map<string, SubLocationRef>
  poses: string[]
  outfitIds: string[]
  outfitIdSet: Set<string>
}): JSX.Element {
  const cfg = (): RoleConfig => props.cfg()
  return (
    <>
      <div class="field">
        <label class="field-label">STARTING LOCATION</label>
        <FilteredSelect
          options={props.subLocationKeys}
          value={
            cfg().startingLocationId && cfg().startingSubLocationId
              ? subLocationKey(cfg().startingLocationId, cfg().startingSubLocationId)
              : ''
          }
          onChange={(v) => {
            const ref = props.subLocationByKey.get(v)
            props.onPatch({
              startingLocationId: ref?.locationId ?? '',
              startingSubLocationId: ref?.subLocationId ?? ''
            })
          }}
          placeholder="Filter locations…"
          invalid={
            !cfg().startingLocationId ||
            !cfg().startingSubLocationId ||
            !props.subLocationByKey.has(
              subLocationKey(cfg().startingLocationId, cfg().startingSubLocationId)
            )
          }
          errorMessage={
            !cfg().startingLocationId || !cfg().startingSubLocationId
              ? 'Location is required'
              : !props.subLocationByKey.has(
                    subLocationKey(cfg().startingLocationId, cfg().startingSubLocationId)
                  )
                ? 'Location not found'
                : undefined
          }
        />
      </div>

      <div class="field">
        <label class="field-label">STARTING POSE</label>
        <FilteredSelect
          options={props.poses}
          value={cfg().startingPoseId}
          onChange={(v) => props.onPatch({ startingPoseId: v })}
          placeholder="Filter poses…"
          invalid={!cfg().startingPoseId || !props.poses.includes(cfg().startingPoseId)}
          errorMessage={
            !cfg().startingPoseId
              ? 'Pose is required'
              : !props.poses.includes(cfg().startingPoseId)
                ? 'Pose not available in this location'
                : undefined
          }
        />
      </div>

      <div class="field">
        <label class="field-label">STARTING OUTFIT</label>
        <FilteredSelect
          options={props.outfitIds}
          value={cfg().startingOutfit}
          onChange={(v) => props.onPatch({ startingOutfit: v })}
          placeholder="Filter outfits…"
          invalid={!cfg().startingOutfit || !props.outfitIdSet.has(cfg().startingOutfit)}
          errorMessage={
            !cfg().startingOutfit
              ? 'Outfit is required'
              : !props.outfitIdSet.has(cfg().startingOutfit)
                ? 'Outfit not found'
                : undefined
          }
        />
      </div>
    </>
  )
}

/**
 * Per-role starting state (`RoleConfig[]`) for a scenario. One editor per
 * scenario role; `roleOrder` is the role's index. A final editor covers
 * the player (`roleOrder` = -1), which is not a Voxta role and adds a
 * persona picker. Starting location / pose / outfit are foreign-id pickers
 * validated against the scenario's `locations.json`, the global `poses.json`,
 * and `outfit.json` `outfits`; the player persona is validated against
 * `player_personas.json`. Edits are staged locally and persisted (via `onSave`)
 * only after validation.
 */
function RolesConfigSection(props: {
  scenarioId: string
  roles: VoxtaScenarioRole[]
  initialRoles: RoleConfig[]
  onSave: (roles: RoleConfig[]) => Promise<void>
}): JSX.Element {
  // One RoleConfig per scenario role (keyed by index = roleOrder), plus a
  // trailing entry for the player (roleOrder = -1).
  const seed = (): RoleConfig[] => [
    ...props.roles.map(
      (_, i) =>
        props.initialRoles.find((r) => r.roleOrder === i) ?? {
          roleOrder: i,
          startingLocationId: '',
          startingSubLocationId: '',
          startingPoseId: '',
          startingOutfit: ''
        }
    ),
    props.initialRoles.find((r) => r.roleOrder === PLAYER_ROLE_ORDER) ?? {
      roleOrder: PLAYER_ROLE_ORDER,
      startingLocationId: '',
      startingSubLocationId: '',
      startingPoseId: '',
      startingOutfit: '',
      personaId: ''
    }
  ]
  // The player is always the last element of the staged array.
  const playerIndex = (): number => props.roles.length

  const [roles, setRoles] = createSignal<RoleConfig[]>(seed())
  const [locations, setLocations] = createSignal<LocationConfig[]>([])
  const [outfitIds, setOutfitIds] = createSignal<string[]>([])
  const [personaIds, setPersonaIds] = createSignal<string[]>([])
  const [status, setStatus] = createSignal('')
  const [errorList, setErrorList] = createSignal<string[]>([])

  // Sub-location pairs derived from the loaded locations.
  const subLocationRefs = createMemo<SubLocationRef[]>(() =>
    locations().flatMap((l) =>
      (l.subLocations ?? [])
        .filter((s) => l.id && s.id)
        .map((s) => ({ locationId: l.id, subLocationId: s.id }))
    )
  )
  // Composite `<loc>/<sub>` keys for the picker options + validation, plus a
  // lookup back to the pair stored on the RoleConfig.
  const subLocationKeys = createMemo(() =>
    subLocationRefs().map((r) => subLocationKey(r.locationId, r.subLocationId))
  )
  const subLocationByKey = createMemo(
    () => new Map(subLocationRefs().map((r) => [subLocationKey(r.locationId, r.subLocationId), r]))
  )
  // Poses available per sub-location: only those defined on that sub-location.
  const posesByKey = createMemo(() => {
    const map = new Map<string, string[]>()
    for (const l of locations()) {
      for (const s of l.subLocations ?? []) {
        if (!l.id || !s.id) continue
        map.set(
          subLocationKey(l.id, s.id),
          (s.poses ?? []).map((p) => p.poseId).filter(Boolean)
        )
      }
    }
    return map
  })
  const posesForRole = (role: RoleConfig): string[] =>
    posesByKey().get(subLocationKey(role.startingLocationId, role.startingSubLocationId)) ?? []
  const outfitIdSet = createMemo(() => new Set(outfitIds()))
  const personaIdSet = createMemo(() => new Set(personaIds()))

  onMount(async () => {
    try {
      const raw = await window.electronAPI.saveData.read(
        `configs/scenarios/${props.scenarioId}/locations.json`
      )
      if (raw) {
        const parsed = JSON.parse(raw) as LocationConfig[]
        if (Array.isArray(parsed)) setLocations(parsed)
      }
    } catch {
      // missing or malformed — leave empty
    }
    try {
      const raw = await window.electronAPI.saveData.read('configs/outfit.json')
      if (raw) {
        const parsed = JSON.parse(raw) as { outfits?: OutfitConfig[] }
        setOutfitIds((parsed.outfits ?? []).map((o) => o.id).filter(Boolean))
      }
    } catch {
      // ignore
    }
    try {
      const raw = await window.electronAPI.saveData.read('configs/player_personas.json')
      if (raw) {
        const parsed = JSON.parse(raw) as PlayerConfig[]
        if (Array.isArray(parsed)) setPersonaIds(parsed.map((p) => p.personaId).filter(Boolean))
      }
    } catch {
      // ignore
    }
  })

  const patchRole = (idx: number, partial: Partial<RoleConfig>): void => {
    setRoles((arr) => arr.map((r, i) => (i === idx ? { ...r, ...partial } : r)))
  }

  const collectErrors = (): string[] => {
    const errs: string[] = []
    roles().forEach((role, idx) => {
      const isPlayer = role.roleOrder === PLAYER_ROLE_ORDER
      const label = isPlayer ? 'Player' : props.roles[idx]?.roleName || `#${idx + 1}`
      const locKey = subLocationKey(role.startingLocationId, role.startingSubLocationId)
      if (!role.startingLocationId || !role.startingSubLocationId)
        errs.push(`Role "${label}": starting location is required`)
      else if (!subLocationByKey().has(locKey))
        errs.push(`Role "${label}": location "${locKey}" not found`)
      if (!role.startingPoseId) errs.push(`Role "${label}": starting pose is required`)
      else if (!posesForRole(role).includes(role.startingPoseId))
        errs.push(`Role "${label}": pose "${role.startingPoseId}" not available in this location`)
      if (!role.startingOutfit) errs.push(`Role "${label}": starting outfit is required`)
      else if (!outfitIdSet().has(role.startingOutfit))
        errs.push(`Role "${label}": outfit "${role.startingOutfit}" not found`)
      if (isPlayer) {
        if (!role.personaId) errs.push(`Role "${label}": persona is required`)
        else if (!personaIdSet().has(role.personaId))
          errs.push(`Role "${label}": persona "${role.personaId}" not found`)
      }
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
      await props.onSave(roles())
      setStatus('Saved')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus(String(err))
    }
  }

  return (
    <>
      <For each={props.roles}>
        {(role, idx) => {
          const cfg = (): RoleConfig => roles()[idx()]
          return (
            <CollapsibleSection title={role.roleName}>
              <RoleFields
                cfg={cfg}
                onPatch={(partial) => patchRole(idx(), partial)}
                subLocationKeys={subLocationKeys()}
                subLocationByKey={subLocationByKey()}
                poses={posesForRole(cfg())}
                outfitIds={outfitIds()}
                outfitIdSet={outfitIdSet()}
              />
            </CollapsibleSection>
          )
        }}
      </For>

      <CollapsibleSection title="Player">
        {(() => {
          const cfg = (): RoleConfig => roles()[playerIndex()]
          return (
            <>
              <RoleFields
                cfg={cfg}
                onPatch={(partial) => patchRole(playerIndex(), partial)}
                subLocationKeys={subLocationKeys()}
                subLocationByKey={subLocationByKey()}
                poses={posesForRole(cfg())}
                outfitIds={outfitIds()}
                outfitIdSet={outfitIdSet()}
              />

              <div class="field">
                <label class="field-label">PERSONA</label>
                <FilteredSelect
                  options={personaIds()}
                  value={cfg().personaId ?? ''}
                  onChange={(v) => patchRole(playerIndex(), { personaId: v })}
                  placeholder="Filter personas…"
                  invalid={!cfg().personaId || !personaIdSet().has(cfg().personaId ?? '')}
                  errorMessage={
                    !cfg().personaId
                      ? 'Persona is required'
                      : !personaIdSet().has(cfg().personaId ?? '')
                        ? 'Persona not found'
                        : undefined
                  }
                />
              </div>
            </>
          )
        })()}
      </CollapsibleSection>

      <div class="list-toolbar">
        <button class="btn btn-primary" onClick={save}>
          Save roles
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
                {(msg) => (
                  <div class="list-row">
                    <div class="list-row-info">
                      <span class="field-error" style={{ 'margin-top': '0' }}>
                        {msg}
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
    </>
  )
}

/**
 * Copies another scenario's entire config directory
 * (`configs/scenarios/<sourceId>/`) over the current scenario's, after a
 * confirmation guard. The source is picked from the other scenarios, filtered by
 * name and shown as `<name>/<id>` to disambiguate duplicate names. The copy is a
 * clean overwrite (stale files unique to the current scenario are removed). On
 * success the page reloads so the Time/Roles/Locations sections re-read the
 * freshly copied files.
 */
function CopyConfigSection(props: { current: VoxtaScenarioSummary }): JSX.Element {
  const [sources, setSources] = createSignal<VoxtaScenarioSummary[]>([])
  const [selectedKey, setSelectedKey] = createSignal('')
  const [confirming, setConfirming] = createSignal(false)
  const [status, setStatus] = createSignal('')

  onMount(async () => {
    try {
      const all = await window.electronAPI.scenario.list()
      setSources(all.filter((s) => s.id !== props.current.id))
    } catch (err) {
      setStatus(String(err))
    }
  })

  // `<name>/<id>` option strings with a lookup back to the source scenario.
  const optionKey = (s: VoxtaScenarioSummary): string => `${s.name}/${s.id}`
  const options = createMemo(() => sources().map(optionKey))
  const byKey = createMemo(() => new Map(sources().map((s) => [optionKey(s), s])))
  const selected = (): VoxtaScenarioSummary | undefined => byKey().get(selectedKey())

  const copy = async (): Promise<void> => {
    const source = selected()
    if (!source) return
    setConfirming(false)
    try {
      await window.electronAPI.saveData.copyDir(
        `configs/scenarios/${source.id}`,
        `configs/scenarios/${props.current.id}`
      )
      setStatus('Copied')
      // Reload so the per-section onMount reads re-pick the copied files.
      window.location.reload()
    } catch (err) {
      setStatus(String(err))
    }
  }

  return (
    <>
      <div class="field">
        <label class="field-label">SOURCE SCENARIO</label>
        <FilteredSelect
          options={options()}
          value={selectedKey()}
          onChange={setSelectedKey}
          placeholder="Filter by scenario name…"
        />
      </div>

      <div class="list-toolbar">
        <button
          class="btn btn-primary"
          disabled={!selected()}
          onClick={() => setConfirming(true)}
        >
          Copy config
        </button>
        <Show when={status()}>
          <span style={{ color: status() === 'Copied' ? 'var(--text-muted)' : '#e74c3c' }}>
            {status()}
          </span>
        </Show>
      </div>

      <Show when={confirming() && selected()}>
        {(source) => (
          <div class="modal-overlay" onClick={() => setConfirming(false)}>
            <div class="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Overwrite config?</h2>
              <p>
                Are you sure you want to overwrite <strong>{props.current.name}</strong> config
                with <strong>{source().name}</strong>?
              </p>
              <div class="modal-actions">
                <button class="btn" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
                <button class="btn btn-primary" onClick={copy}>
                  Overwrite
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </>
  )
}

/**
 * Scenario Config: time settings, per-role starting state, and locations. The
 * scenario summary is passed in via router state from the Scenarios list; on a
 * cold load (e.g. reload) we refetch the list and find it by id. Time lives in
 * `time.json`; roles in `roles.json` (both per-scenario).
 */
export default function ScenarioConfigPage(): JSX.Element {
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation<{ scenario?: VoxtaScenarioSummary }>()
  const rolesPath = `configs/scenarios/${params.scenarioId}/roles.json`

  const [scenario, setScenario] = createSignal<VoxtaScenarioSummary | undefined>(
    location.state?.scenario
  )
  const [initialRoles, setInitialRoles] = createSignal<RoleConfig[]>([])
  const [rolesLoaded, setRolesLoaded] = createSignal(false)
  const [error, setError] = createSignal('')

  onMount(async () => {
    if (!scenario()) {
      try {
        const all = await window.electronAPI.scenario.list()
        setScenario(all.find((s) => s.id === params.scenarioId))
        if (!scenario()) setError(`Scenario not found: ${params.scenarioId}`)
      } catch (err) {
        setError(String(err))
      }
    }

    try {
      const raw = await window.electronAPI.saveData.read(rolesPath)
      if (raw) {
        const parsed = JSON.parse(raw) as RoleConfig[]
        if (Array.isArray(parsed)) setInitialRoles(parsed)
      }
    } catch {
      // missing or malformed — keep empty
    }
    setRolesLoaded(true)
  })

  const start = async (): Promise<void> => {
    const s = scenario()
    if (!s) return
    setError('')
    try {
      const started = await window.electronAPI.scenario.start(s)
      if (started) {
        navigate('/chat', { state: { scenario: s } })
      } else {
        setError('Failed to start scenario')
      }
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div class="list-page">
      <FixedTopBar title={scenario()?.name ?? 'Scenario Config'} onBack={() => navigate(-1)} />

      <div class="list-area">
        <Show when={error()}>
          <p class="list-error">{error()}</p>
        </Show>

        <Show when={scenario()}>
          {(s) => (
            <>
              <CollapsibleSection title="Time">
                <TimeConfigSection scenarioId={s().id} />
              </CollapsibleSection>

              <CollapsibleSection title="Roles">
                <Show when={rolesLoaded()}>
                  <RolesConfigSection
                    scenarioId={s().id}
                    roles={s().roles}
                    initialRoles={initialRoles()}
                    onSave={(roles) =>
                      window.electronAPI.saveData.write(rolesPath, JSON.stringify(roles, null, 2))
                    }
                  />
                </Show>
              </CollapsibleSection>

              <CollapsibleSection title="Locations">
                <LocationsConfigSection scenarioId={s().id} />
              </CollapsibleSection>

              <CollapsibleSection title="Copy from another scenario">
                <CopyConfigSection current={s()} />
              </CollapsibleSection>
            </>
          )}
        </Show>
      </div>

      <FixedBottomBar>
        <button class="btn btn-primary" onClick={start} disabled={!scenario()}>
          Start scenario
        </button>
      </FixedBottomBar>
    </div>
  )
}
