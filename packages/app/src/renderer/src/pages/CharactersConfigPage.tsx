import { createMemo, createSignal, For, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import type { VoxtaCharacterSummary } from '@gen-adventure/shared'
import FixedTopBar from '../components/FixedTopBar'
import SearchBar from '../components/SearchBar'
/** Lists Voxta characters (fetched via main), filterable by name. Each entry
 *  drills into its per-character JSON config. */
export default function CharactersConfigPage(): JSX.Element {
  const navigate = useNavigate()
  const [characters, setCharacters] = createSignal<VoxtaCharacterSummary[]>([])
  const [filter, setFilter] = createSignal('')
  const [error, setError] = createSignal('')

  onMount(async () => {
    try {
      setCharacters(await window.electronAPI.character.list())
    } catch (err) {
      setError(String(err))
    }
  })

  const filtered = createMemo(() => {
    const q = filter().trim().toLowerCase()
    const list = characters()
    return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list
  })

  return (
    <div class="list-page">
      <FixedTopBar title="Characters" onBack={() => navigate(-1)} />

      <div class="list-area">
        <div class="list-toolbar">
          <SearchBar
            value={filter()}
            onInput={setFilter}
            placeholder="Filter by character name…"
          />
        </div>

        <Show when={error()}>
          <p class="list-error">Failed to load characters: {error()}</p>
        </Show>

        <For each={filtered()}>
          {(char) => (
            <div class="list-row" onClick={() => navigate(`/config/characters/${char.id}`)}>
              <div class="list-row-info">
                <span class="list-row-name">{char.name}</span>
                <span class="list-row-id">{char.id}</span>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
