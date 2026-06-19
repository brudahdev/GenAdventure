import { createMemo, createSignal, For, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate, useParams } from '@solidjs/router'
import type { AppearanceConfig, CharacterConfig, VoxtaCharacterSummary } from '@gen-adventure/shared'
import CharacterConfigFields from '../components/CharacterConfigFields'
import ErrorListModal from '../components/ErrorListModal'
import FixedBottomBar from '../components/FixedBottomBar'
import FixedTopBar from '../components/FixedTopBar'
import SearchBar from '../components/SearchBar'
import {
  buildOutput,
  collectErrors,
  emptyConfig,
  parseCharacterConfig,
  type ValidationError
} from '../lib/characterConfigForm'

/** Per-character config editor. Path key is the Voxta character id. */
export default function CharacterConfigPage(): JSX.Element {
  const navigate = useNavigate()
  const params = useParams()

  const [config, setConfig] = createSignal<CharacterConfig>(emptyConfig())
  const [appearanceIds, setAppearanceIds] = createSignal<string[]>([])
  const [status, setStatus] = createSignal('')
  const [errorList, setErrorList] = createSignal<ValidationError[]>([])

  const [characters, setCharacters] = createSignal<VoxtaCharacterSummary[]>([])
  const [copyFilter, setCopyFilter] = createSignal('')
  const [copySourceId, setCopySourceId] = createSignal('')

  const appearanceIdSet = createMemo(() => new Set(appearanceIds()))

  const path = (): string => `configs/characters/${params.characterId}.json`

  const applyCharacterJson = (raw: string): void => {
    const parsed = parseCharacterConfig(raw)
    if (parsed) setConfig(parsed)
  }

  onMount(async () => {
    const [charRaw, appRaw] = await Promise.all([
      window.electronAPI.saveData.read(path()),
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
    applyCharacterJson(charRaw)
    try {
      setCharacters(await window.electronAPI.character.list())
    } catch {
      // Voxta unreachable — copy section simply has no options
    }
  })

  // --- Copy from other character ---

  const copyCandidates = createMemo(() => {
    const q = copyFilter().trim().toLowerCase()
    const list = characters().filter((c) => c.id !== params.characterId)
    return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list
  })

  const copyFrom = async (): Promise<void> => {
    const sourceId = copySourceId()
    if (!sourceId) return
    const raw = await window.electronAPI.saveData.read(`configs/characters/${sourceId}.json`)
    if (!raw) {
      setStatus('Selected character has no saved config')
      return
    }
    try {
      await window.electronAPI.saveData.write(path(), raw)
      applyCharacterJson(raw)
      setStatus('Copied')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus(String(err))
    }
  }

  // --- Save ---

  const save = async (): Promise<void> => {
    const errs = collectErrors(config(), appearanceIdSet())
    if (errs.length > 0) {
      setErrorList(errs)
      return
    }
    setErrorList([])
    try {
      await window.electronAPI.saveData.write(path(), JSON.stringify(buildOutput(config()), null, 2))
      setStatus('Saved')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus(String(err))
    }
  }

  return (
    <div class="list-page">
      <FixedTopBar title="Character Config" onBack={() => navigate(-1)} />

      <div class="list-area">
        <div class="group">
          <h3>Copy From Other Character</h3>
          <div class="field">
            <SearchBar
              value={copyFilter()}
              onInput={setCopyFilter}
              placeholder="Filter characters by name…"
            />
          </div>
          <div class="list-toolbar">
            <select
              class="field-input"
              style={{ flex: '1' }}
              value={copySourceId()}
              onChange={(e) => setCopySourceId(e.currentTarget.value)}
            >
              <option value="">— select a character —</option>
              <For each={copyCandidates()}>
                {(c) => <option value={c.id}>{c.name}</option>}
              </For>
            </select>
            <Show when={copySourceId()}>
              <button class="btn btn-primary" onClick={copyFrom}>
                Copy
              </button>
            </Show>
          </div>
        </div>

        <CharacterConfigFields config={config} setConfig={setConfig} appearanceIds={appearanceIds} />
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
        <ErrorListModal errors={errorList()} onClose={() => setErrorList([])} />
      </Show>
    </div>
  )
}
