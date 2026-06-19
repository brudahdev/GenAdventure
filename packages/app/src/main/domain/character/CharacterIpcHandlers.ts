import { ipcMain } from 'electron'
import { container, singleton } from 'tsyringe'


import { VoxtaScenarioSummary } from '@gen-adventure/shared'
import { ScenarioService } from '../scenario/ScenarioService'
import { CharacterService } from './CharacterService'
import { ICP } from '../../../../../shared/src/icp'

const characterService = container.resolve(CharacterService)

@singleton()
export class CharacterIpcHandlers {
    constructor() {
        ipcMain.handle(ICP.CHARACTERS_LIST,
            async () => {
                return characterService.listCharacters()
            }
        )
    }
}