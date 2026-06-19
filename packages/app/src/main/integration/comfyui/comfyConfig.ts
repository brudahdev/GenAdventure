import { singleton } from 'tsyringe'
import {
  DEFAULT_COMFY_URL,
  MAX_PIXELS,
  type ComfyGenericSettings,
  type ImgGenSettings,
  type WorkflowVariableBindings
} from '@gen-adventure/shared'
import { SaveDataService } from '../../domain/save/SaveDataService'

/**
 * On-disk source of truth for image-generation config, laid out under
 * `save_data/img_gen/`:
 *
 *   img_gen/ImgGenSettings.json               — master enabled toggle
 *   img_gen/ComfyUI/workflows.json            — string[] of imported workflow names
 *   img_gen/ComfyUI/<name>/<name>.json        — the raw workflow JSON
 *   img_gen/ComfyUI/settings.json             — ComfyGenericSettings
 *   img_gen/ComfyUI/<name>/settings.json      — WorkflowVariableBindings
 *
 * `<name>` is a workflow's file basename without its `.json` extension.
 */

const IMG_GEN_SETTINGS = 'img_gen/ImgGenSettings.json'
const COMFY_ROOT = 'img_gen/ComfyUI'
const WORKFLOWS_LIST = `${COMFY_ROOT}/workflows.json`
const COMFY_SETTINGS = `${COMFY_ROOT}/settings.json`

const DEFAULT_IMG_GEN_SETTINGS: ImgGenSettings = {
  enabled: false,
  transparencyEnabled: false,
  transparencyPositivePrompt: '',
  transparencyNegativePrompt: '',
  transparencyBackgroundColor: '#FF00FF',
  transparencySimilarity: 25,
  transparencyEdgeSoftness: 0.5,
  blurBackground: false,
  blurAmount: 4,
  deleteCharacterGenerationsOnQuit: false
}

const DEFAULT_GENERIC_SETTINGS: ComfyGenericSettings = {
  url: DEFAULT_COMFY_URL,
  avatarTargetPixels: 1_048_576, // ~1 MP
  backgroundTargetPixels: MAX_PIXELS,
  seed: 1,
  usePreviews: true,
  selectedWorkflow: ''
}

const EMPTY_BINDINGS: WorkflowVariableBindings = {
  positivePromptOverride: '',
  negativePromptOverride: '',
  positivePromptPath: '',
  negativePromptPath: '',
  widthPath: '',
  heightPath: '',
  seedPath: ''
}

/** Strip a trailing `.json` (case-insensitive) to get a workflow's storage key. */
export function workflowKey(fileName: string): string {
  return fileName.replace(/\.json$/i, '')
}

@singleton()
export class ComfyConfigStore {
  constructor(private readonly saveData: SaveDataService) {}

  private async readJson<T>(relPath: string, fallback: T): Promise<T> {
    const raw = await this.saveData.read(relPath)
    if (!raw) return fallback
    try {
      return { ...fallback, ...(JSON.parse(raw) as object) } as T
    } catch {
      return fallback
    }
  }

  // ---- Master toggle ----

  getImgGenSettings(): Promise<ImgGenSettings> {
    return this.readJson(IMG_GEN_SETTINGS, DEFAULT_IMG_GEN_SETTINGS)
  }

  async setImgGenSettings(settings: ImgGenSettings): Promise<void> {
    await this.saveData.write(IMG_GEN_SETTINGS, JSON.stringify(settings, null, 2))
  }

  // ---- ComfyUI generic settings ----

  getGenericSettings(): Promise<ComfyGenericSettings> {
    return this.readJson(COMFY_SETTINGS, DEFAULT_GENERIC_SETTINGS)
  }

  async setGenericSettings(settings: ComfyGenericSettings): Promise<void> {
    await this.saveData.write(COMFY_SETTINGS, JSON.stringify(settings, null, 2))
  }

  // ---- Workflows ----

  async listWorkflows(): Promise<string[]> {
    const raw = await this.saveData.read(WORKFLOWS_LIST)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as string[]) : []
    } catch {
      return []
    }
  }

  /** Persist a workflow's JSON + register its name. Returns the storage key. */
  async addWorkflow(fileName: string, content: string): Promise<string> {
    const key = workflowKey(fileName)
    await this.saveData.write(`${COMFY_ROOT}/${key}/${key}.json`, content)

    const list = await this.listWorkflows()
    if (!list.includes(key)) list.push(key)
    await this.saveData.write(WORKFLOWS_LIST, JSON.stringify(list, null, 2))

    return key
  }

  /** Raw workflow JSON text, or '' if the workflow is unknown. */
  getWorkflowRaw(key: string): Promise<string> {
    return this.saveData.read(`${COMFY_ROOT}/${workflowKey(key)}/${workflowKey(key)}.json`)
  }

  async getWorkflowJson(key: string): Promise<Record<string, unknown> | null> {
    const raw = await this.getWorkflowRaw(key)
    if (!raw) return null
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return null
    }
  }

  // ---- Per-workflow variable bindings ----

  getBindings(key: string): Promise<WorkflowVariableBindings> {
    return this.readJson(`${COMFY_ROOT}/${workflowKey(key)}/settings.json`, EMPTY_BINDINGS)
  }

  async setBindings(key: string, bindings: WorkflowVariableBindings): Promise<void> {
    await this.saveData.write(
      `${COMFY_ROOT}/${workflowKey(key)}/settings.json`,
      JSON.stringify(bindings, null, 2)
    )
  }
}
