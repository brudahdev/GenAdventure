import { createMemo, createSignal, For, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import type { VoxtaScenarioSummary } from '@gen-adventure/shared'
import FixedTopBar from '../components/FixedTopBar'
import SearchBar from '../components/SearchBar'
/** Lists Voxta scenarios (fetched via main), filterable by name. Each entry drills
 *  into its Scenario Config page, passing the scenario through router state. */
export default function ScenariosConfigPage(): JSX.Element {
  const navigate = useNavigate()
  const [scenarios, setScenarios] = createSignal<VoxtaScenarioSummary[]>([])
  const [filter, setFilter] = createSignal('')
  const [error, setError] = createSignal('')

  onMount(async () => {
    try {
      setScenarios(await window.electronAPI.scenario.list())
    } catch (err) {
      setError(String(err))
    }
  })

  const filtered = createMemo(() => {
    const q = filter().trim().toLowerCase()
    const list = scenarios()
    return q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list
  })

  return (
    <div class="list-page">
      <FixedTopBar title="Scenarios" onBack={() => navigate(-1)} />

      <div class="list-area">
        <div class="list-toolbar">
          <SearchBar
            value={filter()}
            onInput={setFilter}
            placeholder="Filter by scenario name…"
          />
        </div>

        <Show when={error()}>
          <p class="list-error">Failed to load scenarios: {error()}</p>
        </Show>

        <For each={filtered()}>
          {(scenario) => (
            <div
              class="list-row"
              onClick={() => navigate(`/config/scenarios/${scenario.id}`, { state: { scenario } })}
            >
              <div class="list-row-info">
                <span class="list-row-name">{scenario.name}</span>
                <Show when={scenario.description}>
                  <span class="list-row-desc">{scenario.description}</span>
                </Show>
                <span class="list-row-id">{scenario.id}</span>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
