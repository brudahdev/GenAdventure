import { BrowserWindow } from 'electron'
import { singleton } from 'tsyringe'
import { ICP } from '../../../../../shared/src/icp'

@singleton()
export class OverlayService {
  show(text?: string): void {
    for (const win of BrowserWindow.getAllWindows())
      win.webContents.send(ICP.OVERLAY_SHOW, text ?? null)
  }

  hide(): void {
    for (const win of BrowserWindow.getAllWindows())
      win.webContents.send(ICP.OVERLAY_HIDE)
  }
}
