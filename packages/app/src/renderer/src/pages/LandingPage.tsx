import { createSignal, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import ConfigButton from '../components/ConfigButton'
import VoxtaConfigModal from '../components/VoxtaConfigModal'
import ImageConfigModal from '../components/ImageConfigModal'
import LoadSaveModal from '../components/LoadSaveModal'

export default function LandingPage(): JSX.Element {
  const navigate = useNavigate()
  const [showVoxtaModal, setShowVoxtaModal] = createSignal(false)
  const [showImageModal, setShowImageModal] = createSignal(false)
  const [showLoadModal, setShowLoadModal] = createSignal(false)

  return (
    <div class="landing">
      <h1>GenAdventure</h1>

      <div class="landing-buttons">
        <ConfigButton label="Voxta Config" onClick={() => setShowVoxtaModal(true)} />
        <ConfigButton label="Scenarios" onClick={() => navigate('/config/scenarios')} />
        <ConfigButton label="Load Save" onClick={() => setShowLoadModal(true)} />
        <ConfigButton label="Characters" onClick={() => navigate('/config/characters')} />
        <ConfigButton label="Players" onClick={() => navigate('/config/players')} />
        <ConfigButton
          label="Appearance Config"
          onClick={() => navigate('/config/appearance')}
        />
        <ConfigButton label="Outfit Config" onClick={() => navigate('/config/outfit')} />
        <ConfigButton
          label="Clothing Item Config"
          onClick={() => navigate('/config/clothing')}
        />
        <ConfigButton label="Pose Config" onClick={() => navigate('/config/poses')} />
        <ConfigButton label="Image Config" onClick={() => setShowImageModal(true)} />
      </div>

      <Show when={showVoxtaModal()}>
        <VoxtaConfigModal onClose={() => setShowVoxtaModal(false)} />
      </Show>

      <Show when={showImageModal()}>
        <ImageConfigModal onClose={() => setShowImageModal(false)} />
      </Show>

      <Show when={showLoadModal()}>
        <LoadSaveModal onClose={() => setShowLoadModal(false)} />
      </Show>
    </div>
  )
}
