import { createSignal, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import type { ImgGenSettings } from '@gen-adventure/shared'

interface ImageConfigFormProps {
  /** When set, renders a "ComfyUI Config" button (landing context only). */
  onOpenComfyConfig?: () => void
  /** When true, renders a "Recalculate Transparency" button (chat context). */
  showRecalculate?: boolean
}

/**
 * Image-generation settings body, shared by the landing-page popup
 * ({@link ImageConfigModal}) and the chat-page dropdown. Owns its own settings
 * signal and persists the whole object on every change.
 */
export default function ImageConfigForm(props: ImageConfigFormProps): JSX.Element {
  const [settings, setSettings] = createSignal<ImgGenSettings | null>(null)

  onMount(async () => {
    setSettings(await window.electronAPI.imageGen.getSettings())
  })

  /** Patch the in-memory settings and persist the whole object. */
  const patch = async (partial: Partial<ImgGenSettings>): Promise<void> => {
    const current = settings()
    if (!current) return
    const next = { ...current, ...partial }
    setSettings(next)
    await window.electronAPI.imageGen.setSettings(next)
  }

  const recalculate = (): Promise<void> => window.electronAPI.imageGen.recalculate()

  const recalculateBackground = (): Promise<void> =>
    window.electronAPI.imageGen.recalculateBackground()

  return (
    <Show when={settings()} fallback={<p>Loading…</p>}>
      {(s) => (
        <>
          <label class="toggle-row">
            <input
              type="checkbox"
              checked={s().enabled}
              onChange={(e) => void patch({ enabled: e.currentTarget.checked })}
            />
            <span>Enable image generation</span>
          </label>

          <Show when={s().enabled}>
            <Show when={props.onOpenComfyConfig}>
              <button class="btn" onClick={() => props.onOpenComfyConfig?.()}>
                ComfyUI Config
              </button>
            </Show>

            <label class="toggle-row">
              <input
                type="checkbox"
                checked={s().deleteCharacterGenerationsOnQuit}
                onChange={(e) => void patch({ deleteCharacterGenerationsOnQuit: e.currentTarget.checked })}
              />
              <span>Delete character images on quit</span>
            </label>

            <label class="toggle-row">
              <input
                type="checkbox"
                checked={s().transparencyEnabled}
                onChange={(e) => void patch({ transparencyEnabled: e.currentTarget.checked })}
              />
              <span>Enable Avatar Transparency</span>
            </label>

            <Show when={s().transparencyEnabled}>
              <div class="field">
                <label class="field-label">TRANSPARENCY POSITIVE PROMPT</label>
                <input
                  class="field-input"
                  type="text"
                  value={s().transparencyPositivePrompt}
                  onInput={(e) =>
                    void patch({ transparencyPositivePrompt: e.currentTarget.value })
                  }
                />
              </div>

              <div class="field">
                <label class="field-label">TRANSPARENCY NEGATIVE PROMPT</label>
                <input
                  class="field-input"
                  type="text"
                  value={s().transparencyNegativePrompt}
                  onInput={(e) =>
                    void patch({ transparencyNegativePrompt: e.currentTarget.value })
                  }
                />
              </div>

              <div class="field">
                <label class="field-label">BACKGROUND COLOR</label>
                <input
                  class="field-input field-color"
                  type="color"
                  value={s().transparencyBackgroundColor}
                  onInput={(e) =>
                    void patch({ transparencyBackgroundColor: e.currentTarget.value })
                  }
                />
              </div>

              <div class="field">
                <label class="field-label">SIMILARITY — {s().transparencySimilarity}</label>
                <input
                  class="slider"
                  type="range"
                  min={0}
                  max={765}
                  step={1}
                  value={s().transparencySimilarity}
                  onInput={(e) =>
                    void patch({ transparencySimilarity: Number(e.currentTarget.value) })
                  }
                />
              </div>

              <div class="field">
                <label class="field-label">EDGE SOFTNESS — {s().transparencyEdgeSoftness.toFixed(2)}</label>
                <input
                  class="slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={s().transparencyEdgeSoftness}
                  onInput={(e) =>
                    void patch({ transparencyEdgeSoftness: Number(e.currentTarget.value) })
                  }
                />
              </div>
            </Show>

            <label class="toggle-row">
              <input
                type="checkbox"
                checked={s().blurBackground}
                onChange={(e) => void patch({ blurBackground: e.currentTarget.checked })}
              />
              <span>Enable Background Blur</span>
            </label>

            <Show when={s().blurBackground}>
              <div class="field">
                <label class="field-label">BLUR AMOUNT — {s().blurAmount}</label>
                <input
                  class="slider"
                  type="range"
                  min={1}
                  max={18}
                  step={1}
                  value={s().blurAmount}
                  onInput={(e) => void patch({ blurAmount: Number(e.currentTarget.value) })}
                />
              </div>
            </Show>

            <Show when={props.showRecalculate}>
              <button class="btn btn-primary" onClick={() => void recalculate()}>
                Recalculate Transparency
              </button>
            </Show>

            <Show when={props.showRecalculate && s().blurBackground}>
              <button class="btn btn-primary" onClick={() => void recalculateBackground()}>
                Recalculate Blur
              </button>
            </Show>
          </Show>
        </>
      )}
    </Show>
  )
}
