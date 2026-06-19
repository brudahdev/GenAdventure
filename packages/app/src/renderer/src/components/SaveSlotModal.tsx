import { createSignal, For, Show, onMount } from 'solid-js'
import type { JSX } from 'solid-js'
import { SAVE_SLOT_COUNT, validateSaveName, type SaveSlotInfo } from '@gen-adventure/shared'
import ConfirmModal from './ConfirmModal'

interface SaveSlotModalProps {
  /** The scenario whose 10 slots are shown. */
  scenarioId: string
  onClose: () => void
}

const SLOTS = Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => i + 1)

function formatTime(ms: number): string {
  if (!ms) return ''
  return new Date(ms).toLocaleString()
}

/**
 * The in-chat save picker: ten numbered slots for the active scenario. Empty
 * slots take a (validated, unique) name; filled slots overwrite after a
 * confirmation. Saving delegates to the main process, which knows the running
 * scenario, so only the name + slot are sent.
 */
export default function SaveSlotModal(props: SaveSlotModalProps): JSX.Element {
  const [saves, setSaves] = createSignal<SaveSlotInfo[]>([])
  const [names, setNames] = createSignal<Record<number, string>>({})
  const [errors, setErrors] = createSignal<Record<number, string>>({})
  const [status, setStatus] = createSignal('')
  const [overwriteTarget, setOverwriteTarget] = createSignal<SaveSlotInfo | null>(null)

  const refresh = async (): Promise<void> => {
    const all = await window.electronAPI.saveSlot.list()
    setSaves(all.filter((s) => s.scenarioId === props.scenarioId))
  }

  onMount(refresh)

  const saveForSlot = (slot: number): SaveSlotInfo | undefined =>
    saves().find((s) => s.slot === slot)

  const setName = (slot: number, value: string): void => {
    setNames((prev) => ({ ...prev, [slot]: value }))
    setErrors((prev) => ({ ...prev, [slot]: '' }))
  }

  const persist = async (saveName: string, slot: number): Promise<void> => {
    await window.electronAPI.scenario.save(saveName, slot)
    setNames((prev) => ({ ...prev, [slot]: '' }))
    await refresh()
    setStatus(`Saved to slot ${slot}.`)
    setTimeout(() => setStatus(''), 2500)
  }

  const saveNew = async (slot: number): Promise<void> => {
    const name = (names()[slot] ?? '').trim()
    const formatError = validateSaveName(name)
    if (formatError) {
      setErrors((prev) => ({ ...prev, [slot]: formatError }))
      return
    }
    const clash = saves().some((s) => s.saveName.toLowerCase() === name.toLowerCase())
    if (clash) {
      setErrors((prev) => ({ ...prev, [slot]: 'That name is already used by another slot.' }))
      return
    }
    await persist(name, slot)
  }

  const confirmOverwrite = async (): Promise<void> => {
    const target = overwriteTarget()
    if (!target) return
    setOverwriteTarget(null)
    await persist(target.saveName, target.slot)
  }

  return (
    <>
    <div class="modal-overlay" onClick={() => props.onClose()}>
      <div class="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>Save Game</h2>

        <div class="slot-list">
          <For each={SLOTS}>
            {(slot) => {
              const existing = (): SaveSlotInfo | undefined => saveForSlot(slot)
              return (
                <div class="slot-row">
                  <span class="slot-number">{slot}</span>
                  <Show
                    when={existing()}
                    fallback={
                      <>
                        <div class="slot-input-wrap">
                          <input
                            class="field-input"
                            classList={{ 'field-invalid': !!errors()[slot] }}
                            type="text"
                            placeholder="Empty — enter a save name"
                            value={names()[slot] ?? ''}
                            onInput={(e) => setName(slot, e.currentTarget.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void saveNew(slot)
                            }}
                          />
                          <Show when={errors()[slot]}>
                            <span class="field-error">{errors()[slot]}</span>
                          </Show>
                        </div>
                        <button class="btn btn-primary" onClick={() => void saveNew(slot)}>
                          Save
                        </button>
                      </>
                    }
                  >
                    {(save) => (
                      <>
                        <div class="slot-info">
                          <span class="list-row-name">{save().saveName}</span>
                          <span class="list-row-desc">{formatTime(save().savedAt)}</span>
                        </div>
                        <button class="btn" onClick={() => setOverwriteTarget(save())}>
                          Overwrite
                        </button>
                      </>
                    )}
                  </Show>
                </div>
              )
            }}
          </For>
        </div>

        <div class="modal-actions">
          <Show when={status()}>
            <span class="slot-status">{status()}</span>
          </Show>
          <button class="btn" onClick={() => props.onClose()}>
            Close
          </button>
        </div>
      </div>
    </div>

    <Show when={overwriteTarget()}>
      {(target) => (
        <ConfirmModal
          title="Overwrite save?"
          message={`Slot ${target().slot} ("${target().saveName}") will be overwritten. This cannot be undone.`}
          confirmLabel="Overwrite"
          danger
          onConfirm={() => void confirmOverwrite()}
          onCancel={() => setOverwriteTarget(null)}
        />
      )}
    </Show>
    </>
  )
}
