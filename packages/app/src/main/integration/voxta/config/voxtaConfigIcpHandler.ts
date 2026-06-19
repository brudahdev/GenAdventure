import { ipcMain } from 'electron'
import { container, singleton } from 'tsyringe'
import { ICP } from '../../../../../../shared/src/icp'

import * as voxtaConfig from './voxtaConfig'
import { VoxtaConfig } from '@gen-adventure/shared'


@singleton()
export class VoxtaConfigIcpHandler {
  constructor() {

    ipcMain.handle(ICP.VOA_CONFIG_GET,
      async () => {
        return voxtaConfig.getPublic()
      }
    )

    ipcMain.handle(ICP.VOA_CONFIG_SET,
      async (_, config: VoxtaConfig) => {
        return voxtaConfig.set(config)
      }
    )
  }
}