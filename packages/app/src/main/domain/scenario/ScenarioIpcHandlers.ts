import { ipcMain } from 'electron'
import { container, singleton } from 'tsyringe'

import { ScenarioService } from './ScenarioService'
import { VoxtaScenarioSummary } from '@gen-adventure/shared'
import { ICP } from '../../../../../shared/src/icp'

const launchSenarioService = container.resolve(ScenarioService)

@singleton()
export class ScenarioIpcHandlers {
    constructor() {

        ipcMain.handle(ICP.SCENARIO_START,
            async (_, scenario: VoxtaScenarioSummary) => {
                return launchSenarioService.startScenario(scenario)
            }
        )

        ipcMain.handle(ICP.SCENARIO_LIST,
            async () => {
                return launchSenarioService.listScenarios()
            }
        )

        ipcMain.handle(ICP.SCENARIO_SAVE,
            async (_, saveName: string, slot: number) => {
                return launchSenarioService.persist(saveName, slot)
            }
        )

        ipcMain.handle(ICP.SCENARIO_LOAD,
            async (_, gameJsonPath: string) => {
                return launchSenarioService.loadGame(gameJsonPath)
            }
        )
    }
}