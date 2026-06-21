export type { SimApi, MainApi } from './simApi'
export type {
  InferenceAction,
  InferenceArgument,
  InferenceArgumentType,
  InferenceInvocation,
  InferenceInvocationArgument
} from './inference'
export type { ClothingStateChangeOptionsSummary } from './clothing'
export type { NearbyLocationSummary } from './location'
export type { TouchOptions } from './touch'
export type { NpcActivationChange } from './npc'
export { withTimeout } from './withTimeout'
export { nodeEndpoint } from './nodeEndpoint'
export type { SimStartData, SimResumeData, SimContextItem, SimStartCharacterData, SimStartResult, TimeConfig, SimSaveData, CharacterSaveState, SaveSlotInfo, SaveDocument, SaveManifest, SaveMeta, EntitySnapshot } from './sim-messages'
export { validateSaveName, SAVE_SLOT_COUNT } from './sim-messages'
export {
  CURRENT_SAVE_VERSION,
  serializeSaveDocument,
  serializeManifest,
  buildManifest,
  parseSaveDocument,
  parseManifest,
} from './saveCodec'
export type {
  AppearanceConfig,
  AppearanceClassConfig,
  AppearanceItemConfig,
  AppearanceEntryConfig
} from './config/AppearanceConfig'
export type { OutfitSlotConfig, OutfitConfig } from './config/OutfitConfig'
export type {
  ClothingItemConfig,
  ClothingItemStateConfig,
  ClothingItemStateEntryConfig,
  ClothingStateTransition
} from './config/ClothingItemConfig'
export type {
  LocationConfig,
  LocationLinkConfig,
  SubLocationConfig,
  LocationPoseConfig
} from './config/LocationConfig'
export type { PoseConfig } from './config/PoseConfig'
export type { RoleConfig } from './config/RoleConfig'
export { PLAYER_CHARACTER_ID, PLAYER_ROLE_ORDER } from './config/RoleConfig'
export type { Taggable, IDable } from './Taggable'
export type { CharacterConfig, PlayerConfig, PronounsConfig, ArousalData } from './config/CharacterConfig'
export { DEFAULT_VOXTA_URL } from './config'
export type { VoxtaConfig, PublicVoxtaConfig } from './config'
export { MIN_PIXELS, MAX_PIXELS, DEFAULT_COMFY_URL, BACKGROUND_TRANSITION_FADE_MS } from './imageGeneration'
export type {
  PromptRequest,
  AvatarGeneratedEvent,
  AvatarRemovedEvent,
  BackgroundGeneratedEvent,
  ImgGenSettings,
  ComfyGenericSettings,
  WorkflowVariableBindings,
  WorkflowLeafOption
} from './imageGeneration'
export type {
  VoxtaCharacterSummary,
  VoxtaScenarioRole,
  VoxtaScenarioSummary,
  CharacterDetail,
  ScenarioCharacter,
  ChatMessage,
  // Audio pipeline (main ↔ renderer)
  AudioChunk,
  AudioReplyEnd,
  AudioStartedAck,
  AudioCompleteAck,
  RecordingStartEvent,
  // SignalR hub message domain mirrors
  VoxtaPromptCategory,
  VoxtaPromptPosition,
  VoxtaFunctionArgumentType,
  VoxtaFunctionTiming,
  VoxtaContext,
  VoxtaActionEffect,
  VoxtaFunctionArgumentDefinition,
  VoxtaScenarioAction,
  VoxtaFormField,
  VoxtaForm,
  VoxtaGenerateConstraintRequest,
  VoxtaActionInvocationArgument,
  VoxtaClientAuthenticate,
  VoxtaClientRegisterApp,
  VoxtaClientStartChat,
  VoxtaClientSend,
  VoxtaClientUpdateContext,
  VoxtaClientInterrupt,
  VoxtaClientSpeechPlaybackStart,
  VoxtaClientSpeechPlaybackComplete,
  VoxtaClientInspect,
  VoxtaClientStopChat,
  VoxtaClientAddChatParticipant,
  VoxtaClientRemoveChatParticipant,
  VoxtaClientPauseChat,
  VoxtaClientMessage,
  VoxtaServerWelcome,
  VoxtaServerAuthenticationRequired,
  VoxtaServerChatStarting,
  VoxtaServerChatStarted,
  VoxtaServerReplyStart,
  VoxtaServerReplyChunk,
  VoxtaServerReplyEnd,
  VoxtaServerAction,
  VoxtaServerError,
  VoxtaServerChatSessionError,
  VoxtaServerMissingResourcesError,
  VoxtaServerVisionCaptureRequest,
  VoxtaServerRecordingRequest,
  VoxtaServerSpeechRecognitionPartial,
  VoxtaServerSpeechRecognitionEnd,
  VoxtaServerMessage
} from './voxta'

