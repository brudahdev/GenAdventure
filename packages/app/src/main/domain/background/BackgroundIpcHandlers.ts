import { BrowserWindow, ipcMain } from 'electron'
import { singleton } from 'tsyringe'

import { BackgroundService } from './BackgroundService'
import { ICP } from '../../../../../shared/src/icp'

/** Broadcast a payload to every open window. */
function broadcast(channel: string, payload?: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

/** Application layer for backgrounds: pushes generated background events to the
 *  renderer. */
@singleton()
export class BackgroundIpcHandlers {
  constructor(private readonly backgroundService: BackgroundService) {
    this.backgroundService.onBackground((event) => broadcast(ICP.BACKGROUND_GENERATED, event))

    ipcMain.handle(ICP.BACKGROUND_CURRENT, async () => this.backgroundService.getCurrent())
    ipcMain.handle(ICP.IMG_GEN_RECALCULATE_BACKGROUND, async () =>
      this.backgroundService.recalculate()
    )
    ipcMain.handle(ICP.BACKGROUND_REGENERATE, async () => this.backgroundService.regenerate())
  }
}
