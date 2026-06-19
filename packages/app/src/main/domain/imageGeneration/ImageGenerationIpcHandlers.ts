import { ipcMain } from 'electron'
import { singleton } from 'tsyringe'
import type { ImgGenSettings } from '@gen-adventure/shared'

import { ComfyConfigStore } from '../../integration/comfyui/comfyConfig'
import { ICP } from '../../../../../shared/src/icp'

/**
 * Application layer for the image-generation master settings (the on/off toggle
 * and transparency options). Generated-image push events live in
 * `AvatarIpcHandlers` / `BackgroundIpcHandlers`.
 */
@singleton()
export class ImageGenerationIpcHandlers {
  constructor(private readonly config: ComfyConfigStore) {
    ipcMain.handle(ICP.IMG_GEN_SETTINGS_GET, async () => this.config.getImgGenSettings())
    ipcMain.handle(ICP.IMG_GEN_SETTINGS_SET, async (_, settings: ImgGenSettings) =>
      this.config.setImgGenSettings(settings)
    )
  }
}
