import { ipcMain } from 'electron'
import { container, singleton } from 'tsyringe'
import { ICP } from '../../../../../shared/src/icp'
import { LocationService } from './LocationService'
import { SimManager } from '../sim/SimManager'

const locationService = container.resolve(LocationService)
const simManager = container.resolve(SimManager)

@singleton()
export class LocationIpcHandlers {
    constructor() {
        ipcMain.handle(ICP.LOCATION_OPTIONS_GET, (_e, characterId: string) =>
            locationService.getOptions(characterId)
        )

        ipcMain.handle(
            ICP.LOCATION_MOVE,
            (_e, characterId: string, locationId: string) =>
                simManager.moveUiAction(characterId, locationId)
        )
    }
}
