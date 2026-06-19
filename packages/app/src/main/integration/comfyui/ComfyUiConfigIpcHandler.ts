import { readFile } from 'fs/promises'
import { basename } from 'path'
import { dialog, ipcMain } from 'electron'
import { container, singleton } from 'tsyringe'
import type {
  ComfyGenericSettings,
  WorkflowLeafOption,
  WorkflowVariableBindings
} from '@gen-adventure/shared'

import { ComfyConfigStore } from './comfyConfig'
import { enumerateLeafPaths, pathExists } from './workflowPath'
import { ICP } from '../../../../../shared/src/icp'

const config = container.resolve(ComfyConfigStore)

/** Result of a "Load Workflow" action: the updated list + the imported key. */
interface LoadWorkflowResult {
  workflows: string[]
  added: string | null
}

/**
 * Application layer for ComfyUI config: generic settings, workflow import (native
 * file dialog), the workflow list, per-workflow leaf options for the binding
 * dropdowns, and per-workflow variable bindings (validated against the workflow
 * before saving).
 */
@singleton()
export class ComfyUiConfigIpcHandler {
  constructor() {
    ipcMain.handle(ICP.COMFY_SETTINGS_GET, async () => config.getGenericSettings())
    ipcMain.handle(ICP.COMFY_SETTINGS_SET, async (_, settings: ComfyGenericSettings) =>
      config.setGenericSettings(settings)
    )

    ipcMain.handle(ICP.COMFY_WORKFLOWS_LIST, async () => config.listWorkflows())

    ipcMain.handle(ICP.COMFY_WORKFLOW_LOAD, async (): Promise<LoadWorkflowResult> => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select a ComfyUI workflow',
        properties: ['openFile'],
        filters: [{ name: 'Workflow JSON', extensions: ['json'] }]
      })
      if (canceled || filePaths.length === 0) {
        return { workflows: await config.listWorkflows(), added: null }
      }

      const filePath = filePaths[0]
      const content = await readFile(filePath, 'utf-8')
      JSON.parse(content) // reject non-JSON before persisting
      const added = await config.addWorkflow(basename(filePath), content)
      return { workflows: await config.listWorkflows(), added }
    })

    ipcMain.handle(
      ICP.COMFY_WORKFLOW_PATHS,
      async (_, key: string): Promise<WorkflowLeafOption[]> => {
        const json = await config.getWorkflowJson(key)
        return json ? enumerateLeafPaths(json) : []
      }
    )

    ipcMain.handle(ICP.COMFY_BINDINGS_GET, async (_, key: string) => config.getBindings(key))

    ipcMain.handle(
      ICP.COMFY_BINDINGS_SET,
      async (_, key: string, bindings: WorkflowVariableBindings) => {
        const json = await config.getWorkflowJson(key)
        if (!json) throw new Error(`Workflow not found: ${key}`)

        const pathFields = Object.entries(bindings).filter(([field]) =>
          field.endsWith('Path')
        ) as [string, string][]

        const invalid = pathFields
          .filter(([, path]) => !pathExists(json, path))
          .map(([field]) => field)

        if (invalid.length > 0) {
          throw new Error(`Invalid JSONPath(s): ${invalid.join(', ')}`)
        }

        await config.setBindings(key, bindings)
      }
    )
  }
}
