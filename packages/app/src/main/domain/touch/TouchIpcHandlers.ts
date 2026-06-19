import { ipcMain } from 'electron'
import { container, singleton } from 'tsyringe'
import { ICP } from '../../../../../shared/src/icp'
import { TouchService } from './TouchService'
import { SimManager } from '../sim/SimManager'

const touchService = container.resolve(TouchService)
const simManager = container.resolve(SimManager)

@singleton()
export class TouchIpcHandlers {
    constructor() {
        ipcMain.handle(ICP.TOUCH_OPTIONS_GET, (_e, characterId: string) =>
            touchService.getOptions(characterId)
        )

        ipcMain.handle(
            ICP.TOUCH_ACTION,
            (_e, characterId: string, targetId: string, withId: string, verbId: string) =>
                simManager.touchUiAction(characterId, targetId, withId, verbId)
        )
    }
}
