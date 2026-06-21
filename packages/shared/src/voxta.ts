/**
 * Domain models for Voxta entities. These are the clean, UI-facing shapes that
 * cross the IPC boundary. Voxta REST DTOs live in the main process
 * (main/voxta/voxtaDtos.ts) and are mapped to these — UI never sees a DTO.
 */

/** A character as the UI needs it. `thumbnailUrl` is kept but not rendered yet. */
export interface VoxtaCharacterSummary {
  id: string
  name: string
  thumbnailUrl: string
}

/** A single role within a scenario. `roleOrder` is the role's index in the
 *  scenario's `roles` array (used as its persistence key). */
export interface VoxtaScenarioRole {
  roleName: string
  description: string
  roleOrder: number
  defaultCharacterId: string
}

/** A single character's detail, fetched from `/api/characters/<id>`. Minimal for
 *  now — only `name` is consumed; `id` is the requested character id. */
export interface CharacterDetail {
  id: string
  name: string
}

/** A character participating in the active scenario. `characterId` is its
 *  identity across the sim, chat, and UI; `roleName` is the scenario role's
 *  label; `roleOrder` is the role's index in the scenario `roles` array, kept so
 *  the sim can join against the roleOrder-keyed `roles.json` config. */
export interface ScenarioCharacter {
  name: string
  roleName: string
  roleOrder: number
  characterId: string
  isActive: boolean
}

/** A scenario as the UI needs it. */
export interface VoxtaScenarioSummary {
  id: string
  name: string
  description: string
  roles: VoxtaScenarioRole[]
}

/** A fully-assembled chat message routed to the UI. Character replies arrive from
 *  Voxta as a stream of chunks; ChatService assembles them into one of these and
 *  emits it once the reply completes. User messages (typed or recognized from
 *  speech) are also surfaced as ChatMessages so the UI can echo them. */
export interface ChatMessage {
  messageId: string
  senderId: string
  /** Display name of the sender (character name; empty for user messages). */
  senderName: string
  text: string
  /** Who authored the message — drives UI alignment/styling. */
  role: 'user' | 'character'
}

// ---------------------------------------------------------------------------
// Audio pipeline (main ↔ renderer)
//
// Renderer-facing domain types for streamed TTS playback and mic input. NOT
// Voxta wire DTOs — the main process downloads/maps before these cross IPC.
// ---------------------------------------------------------------------------

/** One ordered, ready-to-play audio segment pushed from main to the renderer.
 *  `dataUrl` is a `data:audio/wav;base64,...` URL; `index` is the per-reply
 *  ordering key (downloads finish out of order, playback must be in order). */
export interface AudioChunk {
  messageId: string
  senderId: string
  index: number
  startIndex: number
  endIndex: number
  isNarration: boolean
  dataUrl: string
  /** The chunk's text — used to reveal the reply in sync with playback (karaoke). */
  text: string
}

/** Main → renderer: a character reply's audio stream is complete — emitted after
 *  the message's last {@link AudioChunk} (ordered through the same download chain),
 *  so the renderer can settle the bubble to its full text deterministically rather
 *  than guessing with a timer. */
export interface AudioReplyEnd {
  messageId: string
}

/** Renderer → main: a chunk has started playing (carries the real duration so
 *  main can relay `speechPlaybackStart` to Voxta). */
export interface AudioStartedAck {
  messageId: string
  index: number
  startIndex: number
  endIndex: number
  duration: number
  isNarration: boolean
}

/** Renderer → main: a chunk finished playing. */
export interface AudioCompleteAck {
  messageId: string
  index: number
}

/** Main → renderer: begin mic capture. Carries the credentials the renderer
 *  needs to open the audio-input WebSocket directly to Voxta. The apiKey is
 *  delivered only here, transiently — never logged, stored, or re-exposed. */
export interface RecordingStartEvent {
  sessionId: string
  voxtaBaseUrl: string
  apiKey: string
}

// ---------------------------------------------------------------------------
// Voxta SignalR hub messages (domain mirrors)
//
// 1:1 domain copies of the wire DTOs in main/voxta/voxtaSignalDtos.ts. The
// main process maps DTO → these before exposing messages to the rest of the
// app, so consumers (and the UI) never see the raw wire format. Shapes are
// intentionally identical for now — mappers are passthrough.
// ---------------------------------------------------------------------------

export type VoxtaPromptCategory =
  | 'All'
  | 'Replies'
  | 'ActionInference'
  | 'Summarization'
  | 'ImageGen'
  | 'Memory'
  | 'Stories'
  | 'ComputerVision'

export type VoxtaPromptPosition = 'Context' | 'System'

export type VoxtaFunctionArgumentType = 'Undefined' | 'String' | 'Integer' | 'Double' | 'Boolean'

export type VoxtaFunctionTiming =
  | 'AfterUserMessage'
  | 'BeforeAssistantMessage'
  | 'AfterAssistantMessage'
  | 'Manual'
  | 'Button'
  | 'AfterAnyMessage'

export interface VoxtaContext {
  text: string
  name?: string
  disabled?: boolean
  flagsFilter?: string
  roleFilter?: string
  applyTo?: VoxtaPromptCategory
  position?: VoxtaPromptPosition
}

export interface VoxtaActionEffect {
  setFlags?: string[]
  clearFlags?: string[]
}

export interface VoxtaFunctionArgumentDefinition {
  name: string
  type: VoxtaFunctionArgumentType
  description?: string
  required?: boolean
}

export interface VoxtaScenarioAction {
  name: string
  description: string
  disabled: boolean
  layer: string
  arguments: VoxtaFunctionArgumentDefinition[]
  timing?: VoxtaFunctionTiming
  effect: VoxtaActionEffect
  shortDescription?: string
  cancelReply?: boolean
  finalLayer?: boolean
  once?: boolean
  flagsFilter?: string
}

export interface VoxtaFormField {
  $type: string
  name: string
  label: string
  text?: string
  defaultValue?: string | boolean | number
  contentTypes?: string[]
  noneLabel?: string
}

export interface VoxtaForm {
  fields: VoxtaFormField[]
}

export interface VoxtaGenerateConstraintRequest {
  maxNewTokens?: number
  maxSentences?: number
  allowMultipleLines?: boolean
  includeChatHistory?: boolean
}

export interface VoxtaActionInvocationArgument {
  name: string
  value: string
}

// --- Client → server messages ---

export interface VoxtaClientAuthenticate {
  $type: 'authenticate'
  client: string
  clientVersion?: string
  scope: string[]
  capabilities: {
    audioOutput?: string
    acceptedAudioContentTypes?: string[]
    audioInput?: string
    visionCapture?: string
    visionSources?: string[]
  }
}

export interface VoxtaClientRegisterApp {
  $type: 'registerApp'
  clientVersion?: string
  iconBase64Url?: string
  label?: string
  characterForm?: VoxtaForm
  scenarioForm?: VoxtaForm
}

export interface VoxtaClientStartChat {
  $type: 'startChat'
  characterId?: string
  characterIds?: string[]
  chatId?: string
  scenarioId?: string
  contextKey?: string
  contexts?: VoxtaContext[]
  actions?: VoxtaScenarioAction[]
}

export interface VoxtaClientSend {
  $type: 'send'
  sessionId: string
  text?: string
  doReply?: boolean
  doUserActionInference?: boolean
  doCharacterActionInference?: boolean
  generateConstraintRequest?: VoxtaGenerateConstraintRequest
}

export interface VoxtaClientUpdateContext {
  $type: 'updateContext'
  sessionId: string
  contextKey?: string
  contexts?: VoxtaContext[]
  actions?: VoxtaScenarioAction[]
  variables?: Record<string, unknown>
  setFlags?: string[]
  enableRoles?: Record<string, boolean>
}

export interface VoxtaClientInterrupt {
  $type: 'interrupt'
  sessionId: string
}

export interface VoxtaClientSpeechPlaybackStart {
  $type: 'speechPlaybackStart'
  sessionId: string
  messageId: string
  startIndex: number
  endIndex: number
  duration: number
  isNarration?: boolean
}

export interface VoxtaClientSpeechPlaybackComplete {
  $type: 'speechPlaybackComplete'
  sessionId: string
  messageId: string
}

export interface VoxtaClientInspect {
  $type: 'inspect'
  enabled: boolean
  sessionId: string
}

export interface VoxtaClientStopChat {
  $type: 'stopChat'
  sessionId: string
}

export interface VoxtaClientAddChatParticipant {
  $type: 'addChatParticipant'
  sessionId: string
  characterId: string
}

export interface VoxtaClientRemoveChatParticipant {
  $type: 'removeChatParticipant'
  sessionId: string
  characterId: string
}

export interface VoxtaClientPauseChat {
  $type: 'pauseChat'
  sessionId: string
  pause: boolean
}

export type VoxtaClientMessage =
  | VoxtaClientAuthenticate
  | VoxtaClientRegisterApp
  | VoxtaClientStartChat
  | VoxtaClientSend
  | VoxtaClientUpdateContext
  | VoxtaClientInterrupt
  | VoxtaClientSpeechPlaybackStart
  | VoxtaClientSpeechPlaybackComplete
  | VoxtaClientInspect
  | VoxtaClientStopChat
  | VoxtaClientAddChatParticipant
  | VoxtaClientRemoveChatParticipant
  | VoxtaClientPauseChat

// --- Server → client messages ---

export interface VoxtaServerWelcome {
  $type: 'welcome'
  user: { name: string }
  characters?: Array<{ id: string; name: string }>
  assistant?: { id: string; name: string }
}

export interface VoxtaServerAuthenticationRequired {
  $type: 'authenticationRequired'
}

export interface VoxtaServerChatStarting {
  $type: 'chatStarting'
}

export interface VoxtaServerChatStarted {
  $type: 'chatStarted'
  chatId: string
  sessionId: string
  characters: Array<{
    id: string
    name: string
    appConfiguration?: Record<string, string>
  }>
}

export interface VoxtaServerReplyStart {
  $type: 'replyStart'
  sessionId: string
  messageId: string
  senderId: string
}

export interface VoxtaServerReplyChunk {
  $type: 'replyChunk'
  sessionId: string
  messageId: string
  senderId: string
  startIndex: number
  endIndex: number
  text: string
  audioUrl: string
  isNarration: boolean
}

export interface VoxtaServerReplyEnd {
  $type: 'replyEnd'
  sessionId: string
  messageId: string
  senderId: string
}



// {
//   $type: "action",
//   contextKey: "Neena_alter_clothing_state",
//   layer: "act",
//   value: "Neena_alter_clothing_state",
//   role: "Assistant",
//   senderId: "cee5bcf2-b919-ab1c-a9f7-7e080e3d05da",
//   scenarioRole: "role2",
//   arguments: [
//     {
//       name: "subjectName",
//       value: "Neena",
//     },
//     {
//       name: "clothingName",
//       value: "blouse",
//     },
//     {
//       name: "clothingState",
//       value: "unbuttoned",
//     },
//   ],
//   sessionId: "2b335dc6-b100-9774-b769-f70d76889d4c",
// }
export interface VoxtaServerAction {
  $type: 'action'
  sessionId: string
  value: string
  arguments?: VoxtaActionInvocationArgument[]
}

export interface VoxtaServerError {
  $type: 'error'
  message: string
  code?: string
  serviceName?: string
  details?: string
}

export interface VoxtaServerChatSessionError {
  $type: 'chatSessionError'
  sessionId: string
  message: string
  code?: string
  serviceName?: string
  details?: string
  retry?: boolean
}

export interface VoxtaServerMissingResourcesError {
  $type: 'missingResourcesError'
  resources: Array<{ name?: string; serviceName?: string; status?: string; message?: string }>
}

export interface VoxtaServerVisionCaptureRequest {
  $type: 'visionCaptureRequest'
  sessionId: string
  visionCaptureRequestId: string
  source: string
}

export interface VoxtaServerRecordingRequest {
  $type: 'recordingRequest'
  sessionId: string
  enabled: boolean
}

export interface VoxtaServerSpeechRecognitionPartial {
  $type: 'speechRecognitionPartial'
  text?: string
}

/** Final transcription of the user's speech. Voxta emits this once it finishes
 *  recognizing a spoken turn; the recognized `text` becomes the user's message.
 *  TODO confirm exact $type/field against a live Voxta server. */
export interface VoxtaServerSpeechRecognitionEnd {
  $type: 'speechRecognitionEnd'
  sessionId: string
  text: string
}

export type VoxtaServerMessage =
  | VoxtaServerWelcome
  | VoxtaServerAuthenticationRequired
  | VoxtaServerChatStarting
  | VoxtaServerChatStarted
  | VoxtaServerReplyStart
  | VoxtaServerReplyChunk
  | VoxtaServerReplyEnd
  | VoxtaServerAction
  | VoxtaServerError
  | VoxtaServerChatSessionError
  | VoxtaServerMissingResourcesError
  | VoxtaServerVisionCaptureRequest
  | VoxtaServerRecordingRequest
  | VoxtaServerSpeechRecognitionPartial
  | VoxtaServerSpeechRecognitionEnd
  | { $type: string; [key: string]: unknown }
