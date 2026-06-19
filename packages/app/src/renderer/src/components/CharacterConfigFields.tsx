import { createMemo, For, Show } from 'solid-js'
import type { Accessor, JSX, Setter } from 'solid-js'
import type { ArousalData, CharacterConfig, PronounsConfig } from '@gen-adventure/shared'
import CollapsibleSection from './CollapsibleSection'
import FilteredSelect from './FilteredSelect'
import { AROUSAL_FIELDS, isVisible } from '../lib/characterConfigForm'

/** Shared editor body for a CharacterConfig: pronouns, identity, anatomy, appearance
 *  entry ids, and arousal data. Used by both the character and player config pages. */
export default function CharacterConfigFields(props: {
  config: Accessor<CharacterConfig>
  setConfig: Setter<CharacterConfig>
  appearanceIds: Accessor<string[]>
}): JSX.Element {
  const appearanceIdSet = createMemo(() => new Set(props.appearanceIds()))

  const setPronoun = (k: keyof PronounsConfig, v: string): void => {
    props.setConfig((c) => ({ ...c, pronouns: { ...c.pronouns, [k]: v } }))
  }

  const pronounError = (k: keyof PronounsConfig): string | null =>
    props.config().pronouns[k].trim() ? null : 'Required'

  // hasVagina / hasPenis are mutually exclusive; both may be false.
  const setHasVagina = (v: boolean): void => {
    props.setConfig((c) => ({ ...c, hasVagina: v || undefined, hasPenis: v ? undefined : c.hasPenis }))
  }
  const setHasPenis = (v: boolean): void => {
    props.setConfig((c) => ({ ...c, hasPenis: v || undefined, hasVagina: v ? undefined : c.hasVagina }))
  }

  const updateAppearanceId = (idx: number, val: string): void => {
    props.setConfig((c) => {
      const ids = [...c.appearanceEntryIds]
      ids[idx] = val
      return { ...c, appearanceEntryIds: ids }
    })
  }
  const removeAppearanceId = (idx: number): void => {
    props.setConfig((c) => ({ ...c, appearanceEntryIds: c.appearanceEntryIds.filter((_, i) => i !== idx) }))
  }
  const addAppearanceId = (): void => {
    props.setConfig((c) => ({ ...c, appearanceEntryIds: [...c.appearanceEntryIds, ''] }))
  }

  const setArousal = (key: keyof ArousalData, value: number | boolean | undefined): void => {
    props.setConfig((c) => ({ ...c, arousalData: { ...c.arousalData, [key]: value } as ArousalData }))
  }

  const visibleArousalFields = createMemo(() => AROUSAL_FIELDS.filter((f) => isVisible(f, props.config())))

  const numVal = (key: keyof ArousalData): number | '' => {
    const v = props.config().arousalData[key]
    return typeof v === 'number' ? v : ''
  }
  const isFiniteNum = (key: keyof ArousalData): boolean => {
    const v = props.config().arousalData[key]
    return typeof v === 'number' && Number.isFinite(v)
  }
  const onNumberInput = (key: keyof ArousalData, raw: string): void => {
    const n = raw === '' ? undefined : Number(raw)
    setArousal(key, n !== undefined && Number.isNaN(n) ? undefined : n)
  }

  return (
    <>
      <div class="group">
        <h3>Pronouns</h3>
        <div class="field">
          <label class="field-label">HE / SHE</label>
          <input
            class="field-input"
            classList={{ 'field-invalid': !!pronounError('heShe') }}
            type="text"
            value={props.config().pronouns.heShe}
            onInput={(e) => setPronoun('heShe', e.currentTarget.value)}
          />
          <Show when={pronounError('heShe')}>
            <span class="field-error">{pronounError('heShe')}</span>
          </Show>
        </div>
        <div class="field">
          <label class="field-label">HIM / HER</label>
          <input
            class="field-input"
            classList={{ 'field-invalid': !!pronounError('himHer') }}
            type="text"
            value={props.config().pronouns.himHer}
            onInput={(e) => setPronoun('himHer', e.currentTarget.value)}
          />
          <Show when={pronounError('himHer')}>
            <span class="field-error">{pronounError('himHer')}</span>
          </Show>
        </div>
        <div class="field">
          <label class="field-label">HIS / HER</label>
          <input
            class="field-input"
            classList={{ 'field-invalid': !!pronounError('hisHer') }}
            type="text"
            value={props.config().pronouns.hisHer}
            onInput={(e) => setPronoun('hisHer', e.currentTarget.value)}
          />
          <Show when={pronounError('hisHer')}>
            <span class="field-error">{pronounError('hisHer')}</span>
          </Show>
        </div>
      </div>

      <div class="group">
        <h3>Identity</h3>
        <div class="field">
          <label class="field-label">PERSONALITY ID</label>
          <input
            class="field-input"
            type="text"
            value={props.config().personalityId ?? ''}
            onInput={(e) =>
              props.setConfig((c) => ({ ...c, personalityId: e.currentTarget.value || undefined }))
            }
          />
        </div>
      </div>

      <div class="group">
        <h3>Anatomy</h3>
        <label class="toggle-row">
          <input
            type="checkbox"
            checked={!!props.config().hasTits}
            onChange={(e) =>
              props.setConfig((c) => ({ ...c, hasTits: e.currentTarget.checked || undefined }))
            }
          />
          <span>Has tits</span>
        </label>
        <label class="toggle-row">
          <input
            type="checkbox"
            checked={!!props.config().hasVagina}
            onChange={(e) => setHasVagina(e.currentTarget.checked)}
          />
          <span>Has vagina</span>
        </label>
        <label class="toggle-row">
          <input
            type="checkbox"
            checked={!!props.config().hasPenis}
            onChange={(e) => setHasPenis(e.currentTarget.checked)}
          />
          <span>Has penis</span>
        </label>
      </div>

      <div class="group">
        <h3>Appearance Entry IDs</h3>
        <For each={props.config().appearanceEntryIds}>
          {(id, i) => (
            <div class="list-toolbar">
              <div style={{ flex: '1' }}>
                <FilteredSelect
                  options={props.appearanceIds()}
                  value={id}
                  onChange={(v) => updateAppearanceId(i(), v)}
                  placeholder="Filter appearance entries…"
                  invalid={!!id && !appearanceIdSet().has(id)}
                  errorMessage={
                    !!id && !appearanceIdSet().has(id) ? 'Appearance entry not found' : undefined
                  }
                />
              </div>
              <button class="btn" onClick={() => removeAppearanceId(i())}>
                Remove
              </button>
            </div>
          )}
        </For>
        <button class="btn btn-primary" style={{ 'margin-top': '6px' }} onClick={addAppearanceId}>
          + Add Appearance
        </button>
      </div>

      <CollapsibleSection title="Arousal Data" defaultOpen={false}>
        <p style={{ color: 'var(--text-muted)', 'font-size': '13px', 'margin-top': '0' }}>
          <strong>tto</strong> = time-to-orgasm: minutes of that activity to reach orgasm from
          0%. tto values stack across simultaneous activities; negative values lower orgasm %.
          <strong> mult</strong> fields multiply the computed orgasm-% delta
          (orgasm% = mult × orgasm%); negative and 0 multipliers are ignored. Hover a field
          label for its note.
        </p>

        <For each={visibleArousalFields()}>
          {(f) =>
            f.type === 'boolean' ? (
              <label class="toggle-row" title={f.tooltip}>
                <input
                  type="checkbox"
                  checked={!!props.config().arousalData[f.key]}
                  onChange={(e) => setArousal(f.key, e.currentTarget.checked || undefined)}
                />
                <span>{f.label}</span>
              </label>
            ) : (
              <div class="field">
                <label class="field-label" title={f.tooltip}>
                  {f.label}
                </label>
                <input
                  class="field-input"
                  classList={{ 'field-invalid': !!f.required && !isFiniteNum(f.key) }}
                  type="number"
                  value={numVal(f.key)}
                  onInput={(e) => onNumberInput(f.key, e.currentTarget.value)}
                />
                <Show when={!!f.required && !isFiniteNum(f.key)}>
                  <span class="field-error">A number is required</span>
                </Show>
              </div>
            )
          }
        </For>
      </CollapsibleSection>
    </>
  )
}
