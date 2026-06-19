import { ipcMain } from 'electron'
import { container, singleton } from 'tsyringe'
import { ICP } from '../../../../../shared/src/icp'
import { ClothingService } from './ClothingService'
import { SimManager } from '../sim/SimManager'

const clothingService = container.resolve(ClothingService)
const simManager = container.resolve(SimManager)

@singleton()
export class ClothingIpcHandlers {
    constructor() {
        ipcMain.handle(ICP.CLOTHING_OPTIONS_GET, (_e, characterId: string) =>
            clothingService.getOptions(characterId)
        )

        ipcMain.handle(
            ICP.CLOTHING_STATE_CHANGE,
            (_e, characterId: string, clothingItemId: string, stateId: string) =>
                simManager.clothingStateChangeUiAction(characterId, clothingItemId, stateId)
        )
    }
}
