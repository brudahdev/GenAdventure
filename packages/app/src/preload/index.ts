import { contextBridge, ipcRenderer } from 'electron'

import type {
  VoxtaCharacterSummary,
  VoxtaScenarioSummary,
  ChatMessage,
  AudioChunk,
  AudioStartedAck,
  AudioCompleteAck,
  RecordingStartEvent,
  AvatarGeneratedEvent,
  BackgroundGeneratedEvent,
  ImgGenSettings,
  ComfyGenericSettings,
  WorkflowLeafOption,
  WorkflowVariableBindings,
  SaveSlotInfo,
  ClothingStateChangeOptionsSummary,
  NearbyLocationSummary,
  TouchOptions
} from '@gen-adventure/shared'
import { ICP } from '../../../shared/src/icp'

interface VoxtaConfig {
  url: string
  apiKey: string
}


contextBridge.exposeInMainWorld('electronAPI', {
  sim: {
    getValue: (): Promise<number> => ipcRenderer.invoke('sim:get-value')
  },

  voxtaConfig: {
    // Returns { url, hasApiKey } — never the API key itself.
    get: (): Promise<{ url: string; hasApiKey: boolean }> =>
      ipcRenderer.invoke(ICP.VOA_CONFIG_GET),

    set: (config: VoxtaConfig): Promise<void> =>
      ipcRenderer.invoke(ICP.VOA_CONFIG_SET, config)
  },

  character:{
    list: (): Promise<VoxtaCharacterSummary[]> =>
      ipcRenderer.invoke(ICP.CHARACTERS_LIST),
  },

  scenario: {
    list: (): Promise<VoxtaScenarioSummary[]> =>
      ipcRenderer.invoke(ICP.SCENARIO_LIST),

    start: (scenario: VoxtaScenarioSummary): Promise<boolean> =>
      ipcRenderer.invoke(ICP.SCENARIO_START, scenario),

    save: (saveName: string, slot: number): Promise<void> =>
      ipcRenderer.invoke(ICP.SCENARIO_SAVE, saveName, slot),

    load: (gameJsonPath: string): Promise<boolean> =>
      ipcRenderer.invoke(ICP.SCENARIO_LOAD, gameJsonPath)
  },

  saveSlot: {
    list: (): Promise<SaveSlotInfo[]> => ipcRenderer.invoke(ICP.SAVE_SLOT_LIST)
  },

  chat: {
    send: (text: string): Promise<void> =>
      ipcRenderer.invoke(ICP.CHAT_SEND, text),

    quit: (): Promise<void> =>
      ipcRenderer.invoke(ICP.CHAT_QUIT),

    // Subscribe to assembled character messages. Returns an unsubscribe fn.
    onMessage: (callback: (message: ChatMessage) => void): (() => void) => {
      const listener = (_event: unknown, message: ChatMessage): void => callback(message)
      ipcRenderer.on(ICP.CHAT_MESSAGE, listener)
      return () => ipcRenderer.removeListener(ICP.CHAT_MESSAGE, listener)
    },

    // Subscribe to partial ASR text chunks. Returns an unsubscribe fn.
    onPartial: (callback: (text: string) => void): (() => void) => {
      const listener = (_event: unknown, text: string): void => callback(text)
      ipcRenderer.on(ICP.CHAT_PARTIAL, listener)
      return () => ipcRenderer.removeListener(ICP.CHAT_PARTIAL, listener)
    }
  },

  audio: {
    // Ordered, ready-to-play TTS chunks. Returns an unsubscribe fn.
    onPlay: (callback: (chunk: AudioChunk) => void): (() => void) => {
      const listener = (_event: unknown, chunk: AudioChunk): void => callback(chunk)
      ipcRenderer.on(ICP.AUDIO_PLAY, listener)
      return () => ipcRenderer.removeListener(ICP.AUDIO_PLAY, listener)
    },

    // Stop all playback (interrupt). Returns an unsubscribe fn.
    onStop: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on(ICP.AUDIO_STOP, listener)
      return () => ipcRenderer.removeListener(ICP.AUDIO_STOP, listener)
    },

    // Begin mic capture (carries the mic WS credentials). Returns an unsubscribe fn.
    onRecordingStart: (callback: (event: RecordingStartEvent) => void): (() => void) => {
      const listener = (_event: unknown, event: RecordingStartEvent): void => callback(event)
      ipcRenderer.on(ICP.AUDIO_RECORDING_START, listener)
      return () => ipcRenderer.removeListener(ICP.AUDIO_RECORDING_START, listener)
    },

    // Stop mic capture. Returns an unsubscribe fn.
    onRecordingStop: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on(ICP.AUDIO_RECORDING_STOP, listener)
      return () => ipcRenderer.removeListener(ICP.AUDIO_RECORDING_STOP, listener)
    },

    // Report playback started/finished for a chunk (relayed to Voxta).
    started: (ack: AudioStartedAck): Promise<void> =>
      ipcRenderer.invoke(ICP.AUDIO_STARTED, ack),

    complete: (ack: AudioCompleteAck): Promise<void> =>
      ipcRenderer.invoke(ICP.AUDIO_COMPLETE, ack)
  },

  saveData: {
    read: (relPath: string): Promise<string> =>
      ipcRenderer.invoke(ICP.CONFIG_DATA_READ, relPath),

    write: (relPath: string, content: string): Promise<void> =>
      ipcRenderer.invoke(ICP.CONFIG_DATA_WRITE, relPath, content),

    copyDir: (srcRel: string, destRel: string): Promise<void> =>
      ipcRenderer.invoke(ICP.CONFIG_DATA_COPY_DIR, srcRel, destRel)
  },

  avatar: {
    // Generated avatars (url is a genimg:// URL), demuxed by characterId.
    // Returns an unsubscribe fn.
    onGenerated: (callback: (event: AvatarGeneratedEvent) => void): (() => void) => {
      const listener = (_e: unknown, event: AvatarGeneratedEvent): void => callback(event)
      ipcRenderer.on(ICP.AVATAR_GENERATED, listener)
      return () => ipcRenderer.removeListener(ICP.AVATAR_GENERATED, listener)
    },
    // An avatar was removed (NPC deactivated); payload is the characterId.
    // Returns an unsubscribe fn.
    onRemoved: (callback: (characterId: string) => void): (() => void) => {
      const listener = (_e: unknown, characterId: string): void => callback(characterId)
      ipcRenderer.on(ICP.AVATAR_REMOVED, listener)
      return () => ipcRenderer.removeListener(ICP.AVATAR_REMOVED, listener)
    },
    // Snapshot of currently displayed avatars (replay for a freshly mounted page).
    list: (): Promise<AvatarGeneratedEvent[]> => ipcRenderer.invoke(ICP.AVATAR_LIST),
    // Re-roll a character's avatar (regenerate from its stored prompt).
    regenerate: (characterId: string): Promise<void> =>
      ipcRenderer.invoke(ICP.AVATAR_REGENERATE, characterId)
  },

  background: {
    // Generated background (url is a genimg:// URL). Returns an unsubscribe fn.
    onGenerated: (callback: (event: BackgroundGeneratedEvent) => void): (() => void) => {
      const listener = (_e: unknown, event: BackgroundGeneratedEvent): void => callback(event)
      ipcRenderer.on(ICP.BACKGROUND_GENERATED, listener)
      return () => ipcRenderer.removeListener(ICP.BACKGROUND_GENERATED, listener)
    },
    // Current background URL, or null (replay for a freshly mounted page).
    current: (): Promise<string | null> => ipcRenderer.invoke(ICP.BACKGROUND_CURRENT),
    // Re-roll the background (regenerate from its stored prompt).
    regenerate: (): Promise<void> => ipcRenderer.invoke(ICP.BACKGROUND_REGENERATE),
    // Scene-change transition: fade the chat scene to black. Returns an unsubscribe fn.
    onTransitionShow: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on(ICP.BACKGROUND_TRANSITION_SHOW, listener)
      return () => ipcRenderer.removeListener(ICP.BACKGROUND_TRANSITION_SHOW, listener)
    },
    // Scene-change transition: fade the chat scene back in. Returns an unsubscribe fn.
    onTransitionHide: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on(ICP.BACKGROUND_TRANSITION_HIDE, listener)
      return () => ipcRenderer.removeListener(ICP.BACKGROUND_TRANSITION_HIDE, listener)
    }
  },

  imageGen: {
    getSettings: (): Promise<ImgGenSettings> => ipcRenderer.invoke(ICP.IMG_GEN_SETTINGS_GET),
    setSettings: (settings: ImgGenSettings): Promise<void> =>
      ipcRenderer.invoke(ICP.IMG_GEN_SETTINGS_SET, settings),
    // Re-apply transparency to all active avatars with current settings.
    recalculate: (): Promise<void> => ipcRenderer.invoke(ICP.IMG_GEN_RECALCULATE),
    // Re-apply blur to the current background with current settings.
    recalculateBackground: (): Promise<void> =>
      ipcRenderer.invoke(ICP.IMG_GEN_RECALCULATE_BACKGROUND)
  },

  overlay: {
    onShow: (callback: (text: string | null) => void): (() => void) => {
      const listener = (_e: unknown, text: string | null): void => callback(text)
      ipcRenderer.on(ICP.OVERLAY_SHOW, listener)
      return () => ipcRenderer.removeListener(ICP.OVERLAY_SHOW, listener)
    },
    onHide: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on(ICP.OVERLAY_HIDE, listener)
      return () => ipcRenderer.removeListener(ICP.OVERLAY_HIDE, listener)
    }
  },

  time: {
    onUpdate: (callback: (timestamp: number) => void): (() => void) => {
      const listener = (_e: unknown, ts: number): void => callback(ts)
      ipcRenderer.on(ICP.TIME_UPDATE, listener)
      return () => ipcRenderer.removeListener(ICP.TIME_UPDATE, listener)
    },
    pause: (): Promise<void> => ipcRenderer.invoke(ICP.TIME_PAUSE),
    resume: (): Promise<void> => ipcRenderer.invoke(ICP.TIME_RESUME)
  },

  comfy: {
    getSettings: (): Promise<ComfyGenericSettings> => ipcRenderer.invoke(ICP.COMFY_SETTINGS_GET),
    setSettings: (settings: ComfyGenericSettings): Promise<void> =>
      ipcRenderer.invoke(ICP.COMFY_SETTINGS_SET, settings),
    listWorkflows: (): Promise<string[]> => ipcRenderer.invoke(ICP.COMFY_WORKFLOWS_LIST),
    loadWorkflow: (): Promise<{ workflows: string[]; added: string | null }> =>
      ipcRenderer.invoke(ICP.COMFY_WORKFLOW_LOAD),
    getWorkflowPaths: (key: string): Promise<WorkflowLeafOption[]> =>
      ipcRenderer.invoke(ICP.COMFY_WORKFLOW_PATHS, key),
    getBindings: (key: string): Promise<WorkflowVariableBindings> =>
      ipcRenderer.invoke(ICP.COMFY_BINDINGS_GET, key),
    setBindings: (key: string, bindings: WorkflowVariableBindings): Promise<void> =>
      ipcRenderer.invoke(ICP.COMFY_BINDINGS_SET, key, bindings)
  },

  clothing: {
    getOptions: (characterId: string): Promise<ClothingStateChangeOptionsSummary[]> =>
      ipcRenderer.invoke(ICP.CLOTHING_OPTIONS_GET, characterId),
    changeState: (characterId: string, clothingItemId: string, stateId: string): Promise<void> =>
      ipcRenderer.invoke(ICP.CLOTHING_STATE_CHANGE, characterId, clothingItemId, stateId)
  },

  location: {
    getOptions: (characterId: string): Promise<NearbyLocationSummary> =>
      ipcRenderer.invoke(ICP.LOCATION_OPTIONS_GET, characterId),
    move: (characterId: string, locationId: string): Promise<void> =>
      ipcRenderer.invoke(ICP.LOCATION_MOVE, characterId, locationId)
  },

  pose: {
    getOptions: (characterId: string): Promise<string[]> =>
      ipcRenderer.invoke(ICP.POSE_OPTIONS_GET, characterId),
    set: (characterId: string, poseId: string): Promise<void> =>
      ipcRenderer.invoke(ICP.POSE_SET, characterId, poseId)
  },

  touch: {
    getOptions: (characterId: string): Promise<TouchOptions> =>
      ipcRenderer.invoke(ICP.TOUCH_OPTIONS_GET, characterId),
    action: (characterId: string, targetId: string, withId: string, verbId: string): Promise<void> =>
      ipcRenderer.invoke(ICP.TOUCH_ACTION, characterId, targetId, withId, verbId)
  }
})
