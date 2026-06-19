import { ipcMain } from 'electron'
import { container, singleton } from 'tsyringe'
import { ICP } from '../../../../../shared/src/icp'
import { PoseService } from './PoseService'
import { SimManager } from '../sim/SimManager'

const poseService = container.resolve(PoseService)
const simManager = container.resolve(SimManager)

@singleton()
export class PoseIpcHandlers {
    constructor() {
        ipcMain.handle(ICP.POSE_OPTIONS_GET, (_e, characterId: string) =>
            poseService.getOptions(characterId)
        )

        ipcMain.handle(
            ICP.POSE_SET,
            (_e, characterId: string, poseId: string) =>
                simManager.poseUiAction(characterId, poseId)
        )
    }
}
