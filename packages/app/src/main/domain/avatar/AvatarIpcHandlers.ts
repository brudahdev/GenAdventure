import { BrowserWindow, ipcMain } from 'electron'
import { singleton } from 'tsyringe'

import { AvatarService } from './AvatarService'
import { ICP } from '../../../../../shared/src/icp'

/** Broadcast a payload to every open window. */
function broadcast(channel: string, payload?: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

/**
 * Application layer for avatars: pushes generated avatar events to the renderer
 * and bridges the "recalculate transparency" action (which re-applies the current
 * transparency settings to all active avatars).
 */
@singleton()
export class AvatarIpcHandlers {
  constructor(private readonly avatarService: AvatarService) {
    this.avatarService.onAvatar((event) => broadcast(ICP.AVATAR_GENERATED, event))
    this.avatarService.onAvatarRemoved((characterId, useFade) =>
      broadcast(ICP.AVATAR_REMOVED, { characterId, useFade })
    )

    ipcMain.handle(ICP.AVATAR_LIST, async () => this.avatarService.getActive())
    ipcMain.handle(ICP.IMG_GEN_RECALCULATE, async () => this.avatarService.recalculateAll())
    ipcMain.handle(ICP.AVATAR_REGENERATE, async (_, characterId: string) =>
      this.avatarService.regenerate(characterId)
    )
  }
}
