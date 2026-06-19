import 'reflect-metadata'
import { container } from 'tsyringe'
import { app, BrowserWindow } from 'electron'
import { join } from 'path'

import { VoxtaClient } from './integration/voxta/voxtaClient'
import * as voxtaConfig from './integration/voxta/config/voxtaConfig'
import { SimManager } from './domain/sim/SimManager'
import { registerIpcHandlers } from './IpcRegister'
import {
  registerImageScheme,
  registerImageProtocol
} from './domain/imageGeneration/imageProtocol'
import { ComfyConfigStore } from './integration/comfyui/comfyConfig'
import { SaveDataService } from './domain/save/SaveDataService'

// Privileged schemes must be registered before the app is ready.
registerImageScheme()

registerIpcHandlers()

const sim = container.resolve(SimManager)

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerImageProtocol()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  sim.stopSim()
  if (process.platform !== 'darwin') {
    void performCleanupAndQuit()
  }
})

async function performCleanupAndQuit(): Promise<void> {
  const settings = await container.resolve(ComfyConfigStore).getImgGenSettings()
  if (settings.deleteCharacterGenerationsOnQuit) {
    await container.resolve(SaveDataService).deleteDir('img_gen/generated/characters')
  }
  app.quit()
}
