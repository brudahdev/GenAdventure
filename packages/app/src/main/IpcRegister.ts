import { container } from 'tsyringe'
import { ScenarioIpcHandlers } from './domain/scenario/ScenarioIpcHandlers'
import { ChatIpcHandlers } from './domain/chat/ChatIpcHandlers'
import { AudioIpcHandlers } from './domain/audio/AudioIpcHandlers'
import { CharacterIpcHandlers } from './domain/character/CharacterIpcHandlers'
import { CharacterActivationService } from './domain/character/CharacterActivationService'
import { SaveDataIpcHandlers } from './domain/save/SaveDataIpcHandlers'
import { VoxtaConfigIcpHandler } from './integration/voxta/config/voxtaConfigIcpHandler'
import { ImageGenerationIpcHandlers } from './domain/imageGeneration/ImageGenerationIpcHandlers'
import { AvatarIpcHandlers } from './domain/avatar/AvatarIpcHandlers'
import { BackgroundIpcHandlers } from './domain/background/BackgroundIpcHandlers'
import { IMAGE_PROVIDER } from './domain/imageGeneration/ImageProvider'
import { ComfyUiClient } from './integration/comfyui/ComfyUiClient'
import { ComfyUiConfigIpcHandler } from './integration/comfyui/ComfyUiConfigIpcHandler'
import { TimeIpcHandlers } from './domain/time/TimeIpcHandlers'
import { ClothingIpcHandlers } from './domain/clothing/ClothingIpcHandlers'
import { LocationIpcHandlers } from './domain/location/LocationIpcHandlers'
import { PoseIpcHandlers } from './domain/pose/PoseIpcHandlers'
import { TouchIpcHandlers } from './domain/touch/TouchIpcHandlers'



export function registerIpcHandlers(): void {
  // Bind the image generation provider before the service that depends on it.
  container.register(IMAGE_PROVIDER, { useClass: ComfyUiClient })

  container.resolve(ScenarioIpcHandlers)
  container.resolve(ChatIpcHandlers)
  container.resolve(AudioIpcHandlers)
  container.resolve(CharacterIpcHandlers)
  // No IPC handlers of its own, but must be resolved so it subscribes to sim
  // NPC-activation events at startup.
  container.resolve(CharacterActivationService)
  container.resolve(SaveDataIpcHandlers)
  container.resolve(VoxtaConfigIcpHandler)
  container.resolve(ImageGenerationIpcHandlers)
  container.resolve(AvatarIpcHandlers)
  container.resolve(BackgroundIpcHandlers)
  container.resolve(ComfyUiConfigIpcHandler)
  container.resolve(TimeIpcHandlers)
  container.resolve(ClothingIpcHandlers)
  container.resolve(LocationIpcHandlers)
  container.resolve(PoseIpcHandlers)
  container.resolve(TouchIpcHandlers)
}