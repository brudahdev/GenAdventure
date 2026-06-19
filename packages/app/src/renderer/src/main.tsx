import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import LandingPage from './pages/LandingPage'
import AppearanceConfigPage from './pages/AppearanceConfigPage'
import OutfitConfigPage from './pages/OutfitConfigPage'
import ClothingItemConfigPage from './pages/ClothingItemConfigPage'
import CharactersConfigPage from './pages/CharactersConfigPage'
import CharacterConfigPage from './pages/CharacterConfigPage'
import PlayersConfigPage from './pages/PlayersConfigPage'
import PlayerConfigPage from './pages/PlayerConfigPage'
import ScenariosConfigPage from './pages/ScenariosConfigPage'
import ScenarioConfigPage from './pages/ScenarioConfigPage'
import ComfyUiConfigPage from './pages/ComfyUiConfigPage'
import PoseConfigPage from './pages/PoseConfigPage'
import ChatPage from './pages/ChatPage'
import LoadingOverlay from './components/LoadingOverlay'
import './styles/theme.css'
import './styles/components.css'

render(
  () => (
    <>
      <Router>
        <Route path="/" component={LandingPage} />
        <Route path="/config/appearance" component={AppearanceConfigPage} />
        <Route path="/config/outfit" component={OutfitConfigPage} />
        <Route path="/config/clothing" component={ClothingItemConfigPage} />
        <Route path="/config/characters" component={CharactersConfigPage} />
        <Route path="/config/characters/:characterId" component={CharacterConfigPage} />
        <Route path="/config/players" component={PlayersConfigPage} />
        <Route path="/config/players/:personaId" component={PlayerConfigPage} />
        <Route path="/config/scenarios" component={ScenariosConfigPage} />
        <Route path="/config/scenarios/:scenarioId" component={ScenarioConfigPage} />
        <Route path="/config/poses" component={PoseConfigPage} />
        <Route path="/config/comfyui" component={ComfyUiConfigPage} />
        <Route path="/chat" component={ChatPage} />
      </Router>
      <LoadingOverlay />
    </>
  ),
  document.getElementById('root')!
)
