/// <reference types="vite/client" />

// Mirror of the preload contextBridge API (packages/app/src/preload/index.ts).
// Keep this in sync with the preload — they are one contract.
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

interface VoxtaConfigInput {
  url: string
  apiKey: string
}

interface PublicVoxtaConfig {
  url: string
  hasApiKey: boolean
}

declare global {
  interface Window {
    electronAPI: {
      sim: {
        getValue(): Promise<number>
      }
      voxtaConfig: {
        get(): Promise<PublicVoxtaConfig>
        set(config: VoxtaConfigInput): Promise<void>
      }
      character: {
        list(): Promise<VoxtaCharacterSummary[]>
      }
      scenario: {
        list(): Promise<VoxtaScenarioSummary[]>
        start(scenario: VoxtaScenarioSummary): Promise<boolean>
        save(saveName: string, slot: number): Promise<void>
        load(gameJsonPath: string): Promise<boolean>
      }
      saveSlot: {
        list(): Promise<SaveSlotInfo[]>
      }
      chat: {
        send(text: string): Promise<void>
        quit(): Promise<void>
        onMessage(callback: (message: ChatMessage) => void): () => void
        onPartial(callback: (text: string) => void): () => void
      }
      audio: {
        onPlay(callback: (chunk: AudioChunk) => void): () => void
        onStop(callback: () => void): () => void
        onRecordingStart(callback: (event: RecordingStartEvent) => void): () => void
        onRecordingStop(callback: () => void): () => void
        started(ack: AudioStartedAck): Promise<void>
        complete(ack: AudioCompleteAck): Promise<void>
      }
      saveData: {
        read(relPath: string): Promise<string>
        write(relPath: string, content: string): Promise<void>
        copyDir(srcRel: string, destRel: string): Promise<void>
      }
      avatar: {
        onGenerated(callback: (event: AvatarGeneratedEvent) => void): () => void
        onRemoved(callback: (characterId: string) => void): () => void
        list(): Promise<AvatarGeneratedEvent[]>
        regenerate(characterId: string): Promise<void>
      }
      background: {
        onGenerated(callback: (event: BackgroundGeneratedEvent) => void): () => void
        current(): Promise<string | null>
        regenerate(): Promise<void>
        onTransitionShow(callback: () => void): () => void
        onTransitionHide(callback: () => void): () => void
      }
      imageGen: {
        getSettings(): Promise<ImgGenSettings>
        setSettings(settings: ImgGenSettings): Promise<void>
        recalculate(): Promise<void>
        recalculateBackground(): Promise<void>
      }
      overlay: {
        onShow(callback: (text: string | null) => void): () => void
        onHide(callback: () => void): () => void
      }
      time: {
        onUpdate(callback: (timestamp: number) => void): () => void
        pause(): Promise<void>
        resume(): Promise<void>
      }
      comfy: {
        getSettings(): Promise<ComfyGenericSettings>
        setSettings(settings: ComfyGenericSettings): Promise<void>
        listWorkflows(): Promise<string[]>
        loadWorkflow(): Promise<{ workflows: string[]; added: string | null }>
        getWorkflowPaths(key: string): Promise<WorkflowLeafOption[]>
        getBindings(key: string): Promise<WorkflowVariableBindings>
        setBindings(key: string, bindings: WorkflowVariableBindings): Promise<void>
      }
      clothing: {
        getOptions(characterId: string): Promise<ClothingStateChangeOptionsSummary[]>
        changeState(characterId: string, clothingItemId: string, stateId: string): Promise<void>
      }
      location: {
        getOptions(characterId: string): Promise<NearbyLocationSummary>
        move(characterId: string, locationId: string): Promise<void>
      }
      pose: {
        getOptions(characterId: string): Promise<string[]>
        set(characterId: string, poseId: string): Promise<void>
      }
      touch: {
        getOptions(characterId: string): Promise<TouchOptions>
        action(characterId: string, targetId: string, withId: string, verbId: string): Promise<void>
      }
    }
  }
}
