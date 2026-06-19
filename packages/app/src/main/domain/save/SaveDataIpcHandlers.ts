import { ipcMain } from 'electron'
import { container, singleton } from 'tsyringe'


import { ICP } from '../../../../../shared/src/icp'
import { SaveDataService } from './SaveDataService'
import { SaveSlotService } from './SaveSlotService'

const saveDataService = container.resolve(SaveDataService)
const saveSlotService = container.resolve(SaveSlotService)

@singleton()
export class SaveDataIpcHandlers {
    constructor() {

        ipcMain.handle(ICP.SAVE_SLOT_LIST,
            async () => {
                return saveSlotService.listAll()
            }
        )

        ipcMain.handle(ICP.CONFIG_DATA_READ,
            async (_, relPath: string) => {
                return saveDataService.read(relPath)
            }
        )

        ipcMain.handle(ICP.CONFIG_DATA_WRITE,
            async (_, relPath: string, content: string) => {
                return saveDataService.write(relPath, content)
            }
        )

        ipcMain.handle(ICP.CONFIG_DATA_COPY_DIR,
            async (_, srcRel: string, destRel: string) => {
                return saveDataService.copyDir(srcRel, destRel)
            }
        )
    }
}