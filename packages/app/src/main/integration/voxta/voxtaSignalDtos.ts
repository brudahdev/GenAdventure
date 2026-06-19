/**
 * Raw Voxta SignalR hub message shapes — the wire format exchanged over the
 * `SendMessage` / `ReceiveMessage` hub methods. Private to the main-process
 * `voxta/` module; mapped to domain models by voxtaSignalMappers before
 * crossing the IPC boundary. MUST NOT leak to the renderer.
 *
 * Support types shared with the REST DTOs (contexts, actions, function args)
 * are reused from ./voxtaDtos rather than redefined here.
 */

import type {
  VoxtaContextDto,
  VoxtaScenarioActionDto
} from './voxtaDtos'

// ---------------------------------------------------------------------------
// Shared support types
// ---------------------------------------------------------------------------

export interface VoxtaFormFieldDto {
  $type: string
  name: string
  label: string
  text?: string
  defaultValue?: string | boolean | number
  contentTypes?: string[]
  noneLabel?: string
}

export interface VoxtaFormDto {
  fields: VoxtaFormFieldDto[]
}

export interface VoxtaGenerateConstraintRequestDto {
  maxNewTokens?: number
  maxSentences?: number
  allowMultipleLines?: boolean
  includeChatHistory?: boolean
}

export interface VoxtaActionInvocationArgumentDto {
  name: string
  value: string
}

// ---------------------------------------------------------------------------
// Client → server messages
// ---------------------------------------------------------------------------

export interface VoxtaClientAuthenticateDto {
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

export interface VoxtaClientRegisterAppDto {
  $type: 'registerApp'
  clientVersion?: string
  iconBase64Url?: string
  label?: string
  characterForm?: VoxtaFormDto
  scenarioForm?: VoxtaFormDto
}

export interface VoxtaClientStartChatDto {
  $type: 'startChat'
  characterId?: string
  characterIds?: string[] // only if more than one
  chatId?: string
  scenarioId?: string
  // Initial context — processed by the server BEFORE generating the first reply
  contextKey?: string
  contexts?: VoxtaContextDto[]
  actions?: VoxtaScenarioActionDto[]
}

export interface VoxtaClientSendDto {
  $type: 'send'
  sessionId: string
  text?: string
  doReply?: boolean
  doUserActionInference?: boolean
  doCharacterActionInference?: boolean
  generateConstraintRequest?: VoxtaGenerateConstraintRequestDto
}

export interface VoxtaClientUpdateContextDto {
  $type: 'updateContext'
  sessionId: string
  contextKey?: string
  contexts?: VoxtaContextDto[]
  actions?: VoxtaScenarioActionDto[]
  variables?: Record<string, unknown>
  setFlags?: string[]
  enableRoles?: Record<string, boolean>
}

export interface VoxtaClientInterruptDto {
  $type: 'interrupt'
  sessionId: string
}

export interface VoxtaClientSpeechPlaybackStartDto {
  $type: 'speechPlaybackStart'
  sessionId: string
  messageId: string
  startIndex: number
  endIndex: number
  duration: number
  isNarration?: boolean
}

export interface VoxtaClientSpeechPlaybackCompleteDto {
  $type: 'speechPlaybackComplete'
  sessionId: string
  messageId: string
}

export interface VoxtaClientInspectDto {
  $type: 'inspect'
  enabled: boolean
  sessionId: string
}

export interface VoxtaClientStopChatDto {
  $type: 'stopChat'
  sessionId: string
}

export interface VoxtaClientAddChatParticipantDto {
  $type: 'addChatParticipant'
  sessionId: string
  characterId: string
}

export interface VoxtaClientRemoveChatParticipantDto {
  $type: 'removeChatParticipant'
  sessionId: string
  characterId: string
}

export interface VoxtaClientPauseChatDto {
  $type: 'pauseChat'
  sessionId: string
  pause: boolean
}

export type VoxtaClientMessageDto =
  | VoxtaClientAuthenticateDto
  | VoxtaClientRegisterAppDto
  | VoxtaClientStartChatDto
  | VoxtaClientSendDto
  | VoxtaClientUpdateContextDto
  | VoxtaClientInterruptDto
  | VoxtaClientSpeechPlaybackStartDto
  | VoxtaClientSpeechPlaybackCompleteDto
  | VoxtaClientInspectDto
  | VoxtaClientStopChatDto
  | VoxtaClientAddChatParticipantDto
  | VoxtaClientRemoveChatParticipantDto
  | VoxtaClientPauseChatDto

// ---------------------------------------------------------------------------
// Server → client messages
// ---------------------------------------------------------------------------

export interface VoxtaServerWelcomeDto {
  $type: 'welcome'
  user: { name: string }
  characters?: Array<{ id: string; name: string }>
  assistant?: { id: string; name: string }
}

export interface VoxtaServerAuthenticationRequiredDto {
  $type: 'authenticationRequired'
}

export interface VoxtaServerChatStartingDto {
  $type: 'chatStarting'
}

export interface VoxtaServerChatStartedDto {
  $type: 'chatStarted'
  chatId: string
  sessionId: string
  characters: Array<{
    id: string
    name: string
    appConfiguration?: Record<string, string>
  }>
}

export interface VoxtaServerReplyStartDto {
  $type: 'replyStart'
  sessionId: string
  messageId: string
  senderId: string
}

export interface VoxtaServerReplyChunkDto {
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

export interface VoxtaServerReplyEndDto {
  $type: 'replyEnd'
  sessionId: string
  messageId: string
  senderId: string
}

export interface VoxtaServerActionDto {
  $type: 'action'
  sessionId: string
  value: string
  arguments?: VoxtaActionInvocationArgumentDto[]
}

export interface VoxtaServerErrorDto {
  $type: 'error'
  message: string
  code?: string
  serviceName?: string
  details?: string
}

export interface VoxtaServerChatSessionErrorDto {
  $type: 'chatSessionError'
  sessionId: string
  message: string
  code?: string
  serviceName?: string
  details?: string
  retry?: boolean
}

export interface VoxtaServerMissingResourcesErrorDto {
  $type: 'missingResourcesError'
  resources: Array<{ name?: string; serviceName?: string; status?: string; message?: string }>
}

export interface VoxtaServerVisionCaptureRequestDto {
  $type: 'visionCaptureRequest'
  sessionId: string
  visionCaptureRequestId: string
  source: string
}

export interface VoxtaServerRecordingRequestDto {
  $type: 'recordingRequest'
  sessionId: string
  enabled: boolean
}

export interface VoxtaServerSpeechRecognitionPartialDto {
  $type: 'speechRecognitionPartial'
  text?: string
}

/** Final transcription of a spoken user turn. TODO confirm $type/field vs Voxta. */
export interface VoxtaServerSpeechRecognitionEndDto {
  $type: 'speechRecognitionEnd'
  sessionId: string
  text: string
}

export type VoxtaServerMessageDto =
  | VoxtaServerWelcomeDto
  | VoxtaServerAuthenticationRequiredDto
  | VoxtaServerChatStartingDto
  | VoxtaServerChatStartedDto
  | VoxtaServerReplyStartDto
  | VoxtaServerReplyChunkDto
  | VoxtaServerReplyEndDto
  | VoxtaServerActionDto
  | VoxtaServerErrorDto
  | VoxtaServerChatSessionErrorDto
  | VoxtaServerMissingResourcesErrorDto
  | VoxtaServerVisionCaptureRequestDto
  | VoxtaServerRecordingRequestDto
  | VoxtaServerSpeechRecognitionPartialDto
  | VoxtaServerSpeechRecognitionEndDto
  | { $type: string; [key: string]: unknown }
