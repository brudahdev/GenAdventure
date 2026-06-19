import { createSignal, createMemo, onMount, onCleanup, Show } from 'solid-js'
import type { JSX } from 'solid-js'

function formatTime(ts: number): { time: string; date: string } {
  const d = new Date(ts)
  let hours = d.getHours()
  const minutes = d.getMinutes()
  const seconds = d.getSeconds()
  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12 || 12
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${ampm}`
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return { time, date }
}

interface Props {
  hidden?: boolean
}

export default function GameClock(props: Props): JSX.Element {
  const [gameTime, setGameTime] = createSignal<number | null>(null)
  const [paused, setPaused] = createSignal(false)

  onMount(() => {
    const unsub = window.electronAPI.time.onUpdate((ts) => setGameTime(ts))
    onCleanup(unsub)
  })

  const formatted = createMemo(() => {
    const ts = gameTime()
    if (ts === null) return null
    return formatTime(ts)
  })

  const togglePause = (): void => {
    if (paused()) {
      void window.electronAPI.time.resume()
      setPaused(false)
    } else {
      void window.electronAPI.time.pause()
      setPaused(true)
    }
  }

  return (
    <Show when={!props.hidden}>
      <Show when={formatted()}>
        {(fmt) => (
          <div class="game-clock">
            <div class="game-clock-time">{fmt().time}</div>
            <div class="game-clock-date">{fmt().date}</div>
            <button
              class="game-clock-pause"
              classList={{ 'is-paused': paused() }}
              onClick={togglePause}
              title={paused() ? 'Resume' : 'Pause'}
            />
          </div>
        )}
      </Show>
    </Show>
  )
}
