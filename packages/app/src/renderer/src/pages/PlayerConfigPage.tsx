import { createMemo, createSignal, For, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate, useParams } from '@solidjs/router'
import type { AppearanceConfig, CharacterConfig, PlayerConfig } from '@gen-adventure/shared'
import CharacterConfigFields from '../components/CharacterConfigFields'
import ErrorListModal from '../components/ErrorListModal'
import FixedBottomBar from '../components/FixedBottomBar'
import FixedTopBar from '../components/FixedTopBar'
import {
  buildOutput,
  collectErrors,
  emptyConfig,
  parseCharacterConfig,
  type ValidationError
} from '../lib/characterConfigForm'

const PATH = 'configs/player_personas.json'

/** Per-persona config editor. The persona id is the array key in player_personas.json
 *  and is fixed once created. */
export default function PlayerConfigPage(): JSX.Element {
  const navigate = useNavigate()
  const params = useParams()

  const [config, setConfig] = createSignal<CharacterConfig>(emptyConfig())
  const [appearanceIds, setAppearanceIds] = createSignal<string[]>([])
  const [status, setStatus] = createSignal('')
  const [errorList, setErrorList] = createSignal<ValidationError[]>([])

  const [otherIds, setOtherIds] = createSignal<string[]>([])
  const [copySourceId, setCopySourceId] = createSignal('')

  const appearanceIdSet = createMemo(() => new Set(appearanceIds()))

  const readPersonas = async (): Promise<PlayerConfig[]> => {
    const raw = await window.electronAPI.saveData.read(PATH)
    const parsed = raw ? (JSON.parse(raw) as PlayerConfig[]) : []
    return Array.isArray(parsed) ? parsed : []
  }

  onMount(async () => {
    const [personas, appRaw] = await Promise.all([
      readPersonas().catch(() => [] as PlayerConfig[]),
      window.electronAPI.saveData.read('configs/appearance.json')
    ])
    try {
      if (appRaw) {
        const app = JSON.parse(appRaw) as Partial<AppearanceConfig>
        setAppearanceIds((app.appearance ?? []).map((e) => e.id).filter(Boolean))
      }
    } catch {
      // missing or malformed appearance config — leave options empty
    }
    const entry = personas.find((p) => p.personaId === params.personaId)
    if (entry) {
      const parsed = parseCharacterConfig(JSON.stringify(entry))
      if (parsed) setConfig(parsed)
    }
    setOtherIds(personas.map((p) => p.personaId).filter((id) => id !== params.personaId))
  })

  // --- Copy from other persona ---

  const copyFrom = async (): Promise<void> => {
    const sourceId = copySourceId()
    if (!sourceId) return
    const personas = await readPersonas()
    const source = personas.find((p) => p.personaId === sourceId)
    if (!source) {
      setStatus('Selected persona not found')
      return
    }
    const parsed = parseCharacterConfig(JSON.stringify(source))
    if (parsed) setConfig(parsed)
    setStatus('Copied')
    setTimeout(() => setStatus(''), 2000)
  }

  // --- Save (upsert into the personas array) ---

  const save = async (): Promise<void> => {
    const errs = collectErrors(config(), appearanceIdSet())
    if (errs.length > 0) {
      setErrorList(errs)
      return
    }
    setErrorList([])
    try {
      const out: PlayerConfig = { ...buildOutput(config()), personaId: params.personaId! }
      const personas = await readPersonas()
      const idx = personas.findIndex((p) => p.personaId === params.personaId)
      if (idx >= 0) personas[idx] = out
      else personas.push(out)
      await window.electronAPI.saveData.write(PATH, JSON.stringify(personas, null, 2))
      setStatus('Saved')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus(String(err))
    }
  }

  return (
    <div class="list-page">
      <FixedTopBar title={`Player Config — ${params.personaId}`} onBack={() => navigate(-1)} />

      <div class="list-area">
        <Show when={otherIds().length > 0}>
          <div class="group">
            <h3>Copy From Other Persona</h3>
            <div class="list-toolbar">
              <select
                class="field-input"
                style={{ flex: '1' }}
                value={copySourceId()}
                onChange={(e) => setCopySourceId(e.currentTarget.value)}
              >
                <option value="">— select a persona —</option>
                <For each={otherIds()}>{(id) => <option value={id}>{id}</option>}</For>
              </select>
              <Show when={copySourceId()}>
                <button class="btn btn-primary" onClick={copyFrom}>
                  Copy
                </button>
              </Show>
            </div>
          </div>
        </Show>

        <CharacterConfigFields config={config} setConfig={setConfig} appearanceIds={appearanceIds} />
      </div>

      <FixedBottomBar>
        <button class="btn btn-primary" onClick={save}>
          Save
        </button>
        <Show when={status()}>
          <span style={{ color: status() === 'Saved' || status() === 'Copied' ? 'var(--text-muted)' : '#e74c3c' }}>
            {status()}
          </span>
        </Show>
      </FixedBottomBar>

      <Show when={errorList().length > 0}>
        <ErrorListModal errors={errorList()} onClose={() => setErrorList([])} />
      </Show>
    </div>
  )
}
