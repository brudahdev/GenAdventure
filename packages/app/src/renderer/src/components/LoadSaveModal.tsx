import { createMemo, createSignal, For, Show, onMount } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import type { SaveSlotInfo, VoxtaScenarioSummary } from '@gen-adventure/shared'
import SearchBar from './SearchBar'

interface LoadSaveModalProps {
  onClose: () => void
}

interface SaveRow extends SaveSlotInfo {
  scenarioName: string
  /** The resolved scenario (when it still exists in Voxta), passed to the chat page. */
  scenario?: VoxtaScenarioSummary
}

function formatTime(ms: number): string {
  if (!ms) return ''
  return new Date(ms).toLocaleString()
}

/**
 * The main-page load picker: every save on disk, searchable by save name,
 * scenario id, chat id, or scenario name (resolved from Voxta). Selecting a row
 * hands the save's game.json path to the main process (loadGame is stubbed).
 */
export default function LoadSaveModal(props: LoadSaveModalProps): JSX.Element {
  const navigate = useNavigate()
  const [rows, setRows] = createSignal<SaveRow[]>([])
  const [query, setQuery] = createSignal('')
  const [error, setError] = createSignal('')

  onMount(async () => {
    try {
      const [saves, scenarios] = await Promise.all([
        window.electronAPI.saveSlot.list(),
        window.electronAPI.scenario.list()
      ])
      const byId = new Map(scenarios.map((s) => [s.id, s]))
      setRows(
        saves
          .map((s) => ({
            ...s,
            scenario: byId.get(s.scenarioId),
            scenarioName: byId.get(s.scenarioId)?.name ?? ''
          }))
          .sort((a, b) => b.savedAt - a.savedAt)
      )
    } catch (err) {
      setError(String(err))
    }
  })

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase()
    if (!q) return rows()
    return rows().filter((r) =>
      [r.saveName, r.scenarioId, r.chatId, r.scenarioName]
        .some((field) => field.toLowerCase().includes(q))
    )
  })

  const load = async (row: SaveRow): Promise<void> => {
    setError('')
    try {
      const ok = await window.electronAPI.scenario.load(row.gameJsonPath)
      if (!ok) {
        setError('Failed to load save (the scenario may no longer exist).')
        return
      }
      props.onClose()
      navigate('/chat', { state: { scenario: row.scenario } })
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div class="modal-overlay" onClick={() => props.onClose()}>
      <div class="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>Load Save</h2>

        <SearchBar
          value={query()}
          onInput={setQuery}
          placeholder="Search by save name, scenario, or chat id…"
        />

        <Show when={error()}>
          <p class="field-error">{error()}</p>
        </Show>

        <div class="load-list">
          <Show
            when={filtered().length > 0}
            fallback={<p class="list-row-desc">No saves found.</p>}
          >
            <For each={filtered()}>
              {(row) => (
                <div class="list-row" onClick={() => void load(row)}>
                  <div class="list-row-info">
                    <span class="list-row-name">
                      {row.saveName}
                      <span class="load-slot-badge">slot {row.slot}</span>
                    </span>
                    <span class="list-row-desc">
                      {row.scenarioName || row.scenarioId} · {formatTime(row.savedAt)}
                    </span>
                    <span class="list-row-id">chat {row.chatId}</span>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>

        <div class="modal-actions">
          <button class="btn" onClick={() => props.onClose()}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
