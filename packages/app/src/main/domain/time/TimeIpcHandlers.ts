import { ipcMain } from 'electron'
import { container, singleton } from 'tsyringe'
import { ICP } from '../../../../../shared/src/icp'
import { SimManager } from '../sim/SimManager'

const simManager = container.resolve(SimManager)

@singleton()
export class TimeIpcHandlers {
    constructor() {
        ipcMain.handle(ICP.TIME_PAUSE, () => {
            simManager.pauseTime()
        })

        ipcMain.handle(ICP.TIME_RESUME, () => {
            simManager.resumeTime()
        })
    }
}
