import { createMemo, createSignal, For, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import type { PlayerConfig } from '@gen-adventure/shared'
import FixedTopBar from '../components/FixedTopBar'
import SearchBar from '../components/SearchBar'
import { emptyConfig } from '../lib/characterConfigForm'

const PATH = 'configs/player_personas.json'

/** Lists player personas stored as an array in player_personas.json, filterable by
 *  persona id. Supports adding a new (user-defined) persona id and deleting one.
 *  Each entry drills into its editor. */
export default function PlayersConfigPage(): JSX.Element {
  const navigate = useNavigate()
  const [personas, setPersonas] = createSignal<PlayerConfig[]>([])
  const [filter, setFilter] = createSignal('')
  const [newId, setNewId] = createSignal('')
  const [error, setError] = createSignal('')
  const [pendingDelete, setPendingDelete] = createSignal('')

  const load = async (): Promise<void> => {
    try {
      const raw = await window.electronAPI.saveData.read(PATH)
      const parsed = raw ? (JSON.parse(raw) as PlayerConfig[]) : []
      setPersonas(Array.isArray(parsed) ? parsed : [])
    } catch (err) {
      setError(String(err))
    }
  }

  onMount(load)

  const write = (list: PlayerConfig[]): Promise<void> =>
    window.electronAPI.saveData.write(PATH, JSON.stringify(list, null, 2))

  const filtered = createMemo(() => {
    const q = filter().trim().toLowerCase()
    const list = personas()
    return q ? list.filter((p) => p.personaId.toLowerCase().includes(q)) : list
  })

  const addPersona = async (): Promise<void> => {
    const id = newId().trim()
    if (!id) {
      setError('Persona id is required')
      return
    }
    if (personas().some((p) => p.personaId === id)) {
      setError(`Persona "${id}" already exists`)
      return
    }
    setError('')
    const next = [...personas(), { ...emptyConfig(), personaId: id }]
    try {
      await write(next)
      setPersonas(next)
      setNewId('')
      navigate(`/config/players/${encodeURIComponent(id)}`)
    } catch (err) {
      setError(String(err))
    }
  }

  const confirmDelete = async (): Promise<void> => {
    const id = pendingDelete()
    const next = personas().filter((p) => p.personaId !== id)
    try {
      await write(next)
      setPersonas(next)
    } catch (err) {
      setError(String(err))
    } finally {
      setPendingDelete('')
    }
  }

  return (
    <div class="list-page">
      <FixedTopBar title="Players" onBack={() => navigate(-1)} />

      <div class="list-area">
        <div class="list-toolbar">
          <SearchBar value={filter()} onInput={setFilter} placeholder="Filter by persona id…" />
        </div>

        <div class="list-toolbar">
          <input
            class="field-input"
            style={{ flex: '1' }}
            type="text"
            placeholder="New persona id…"
            value={newId()}
            onInput={(e) => setNewId(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPersona()}
          />
          <button class="btn btn-primary" onClick={addPersona}>
            + Add Persona
          </button>
        </div>

        <Show when={error()}>
          <p class="list-error">{error()}</p>
        </Show>

        <For each={filtered()}>
          {(p) => (
            <div class="list-row">
              <div
                class="list-row-info"
                style={{ flex: '1', cursor: 'pointer' }}
                onClick={() => navigate(`/config/players/${encodeURIComponent(p.personaId)}`)}
              >
                <span class="list-row-name">{p.personaId}</span>
              </div>
              <button class="btn" onClick={() => setPendingDelete(p.personaId)}>
                Delete
              </button>
            </div>
          )}
        </For>
      </div>

      <Show when={pendingDelete()}>
        <div class="modal-overlay" onClick={() => setPendingDelete('')}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete persona “{pendingDelete()}”?</h2>
            <div class="modal-actions">
              <button class="btn" onClick={() => setPendingDelete('')}>
                Cancel
              </button>
              <button class="btn btn-primary" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
