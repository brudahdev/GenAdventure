import { createSignal, onMount } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import FixedTopBar from './FixedTopBar'
import FixedBottomBar from './FixedBottomBar'

interface JsonEditorPageProps {
  title: string
  /** File path relative to the save_data/ root, e.g. "configs/appearance.json". */
  path: string
}

/**
 * Reusable full-page plain-text JSON editor. Loads the file on mount, saves to
 * disk via the save_data IPC bridge. Fixed top bar (back) + fixed bottom bar (save).
 */
export default function JsonEditorPage(props: JsonEditorPageProps): JSX.Element {
  const navigate = useNavigate()
  const [content, setContent] = createSignal('')

  onMount(async () => {
    setContent(await window.electronAPI.saveData.read(props.path))
  })

  const save = () => window.electronAPI.saveData.write(props.path, content())

  return (
    <div class="editor-page">
      <FixedTopBar title={props.title} onBack={() => navigate(-1)} />

      <div class="editor-area">
        <textarea
          class="editor-textarea"
          spellcheck={false}
          value={content()}
          onInput={(e) => setContent(e.currentTarget.value)}
        />
      </div>

      <FixedBottomBar>
        <button class="btn btn-primary" onClick={save}>
          Save
        </button>
      </FixedBottomBar>
    </div>
  )
}
