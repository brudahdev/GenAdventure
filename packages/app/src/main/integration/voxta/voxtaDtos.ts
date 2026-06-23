/**
 * Raw Voxta REST response shapes. Private to the main-process `voxta/` module —
 * mapped to domain models by voxtaMappers; MUST NOT leak to the renderer.
 */

export interface CharacterDto {
  id: string
  name: string
  thumbnailUrl: string
  creatorNotes: string
  culture: string
  explicitContent: string
  chatStyle: string
  favorite: boolean
  hidden: boolean
  tags: string[]
  version: string
  appControlled: boolean
  dateCreated: string
  dateCreatedAgo: string
  dateModified: string
  dateModifiedAgo: string
}

export interface CharactersResponseDto {
  characters: CharacterDto[]
}

export interface ScenarioRoleDto {
  name: string
  description: string
  defaultCharacterId: string
}

/** The `/api/scenarios/<id>` detail response (richer than the list `ScenarioDto`).
 *  Only the fields we consume are typed; `impersonation.name` is the scenario's
 *  configured player name. */
export interface ScenarioDetailDto {
  id: string
  name: string
  impersonation?: { name?: string }
}

export interface TextToSpeechConfigDto {
  voice?: Record<string, unknown>
  service?: Record<string, unknown>
}

export interface ThumbnailDto {
  randomizedETag: string
  contentType: string
}

/** Full character "card" returned by `/api/characters/<id>` (distinct from the
 *  lighter `CharacterDto` used by the list endpoint). */
export interface CharacterCardDto {
  memoryBooks: unknown[]
  defaultScenarios: unknown[]
  culture: string
  textToSpeech: TextToSpeechConfigDto[]
  profile: string
  scripts: unknown[]
  chatStyle: string
  explicitContent: string
  enableThinkingSpeech: boolean
  notifyUserAwayReturn: boolean
  timeAware: boolean
  useMemory: boolean
  maxTokens: number
  maxSentences: number
  augmentations: unknown[]
  systemPromptOverrideType: string
  description: string
  personality: string
  scenario: string
  firstMessage: string
  messageExamples: string
  creatorNotes: string
  favorite: boolean
  hidden: boolean
  tags: string[]
  name: string
  appControlled: boolean
  locked: boolean
  version: string
  thumbnail: ThumbnailDto
  dateCreated: string
  dateModified: string
  localId: string
}

export interface ScenarioDto {
  id: string
  name: string
  description: string
  roles: ScenarioRoleDto[]
  creator: string
  explicitContent: string
  chatFlow: string
  chatStyle: string
  narratorCharacterId: string
  chatsCount: number
  favorite: boolean
  hidden: boolean
  version: string
  appControlled: boolean
  dateCreated: string
  dateCreatedAgo: string
  dateModified: string
  dateModifiedAgo: string
}

export interface ScenariosResponseDto {
  scenarios: ScenarioDto[]
}


export interface VoxtaContextDto {
  text: string;
  name?: string;
  disabled?: boolean;
  flagsFilter?: string;
  roleFilter?: string;
  applyTo?: VoxtaPromptCategoryDto;
  position?: VoxtaPromptPositionDto;
}

export type VoxtaPromptCategoryDto =
  | 'All'
  | 'Replies'
  | 'ActionInference'
  | 'Summarization'
  | 'ImageGen'
  | 'Memory'
  | 'Stories'
  | 'ComputerVision';

export type VoxtaPromptPositionDto = 'Context' | 'System';

//client => server
export interface VoxtaScenarioActionDto {
  name: string;
  description: string;
  disabled: boolean;
  layer: string;
  arguments: VoxtaFunctionArgumentDefinitionDto[];
  timing?: VoxtaFunctionTimingDto;
  effect: VoxtaActionEffectDto;
  shortDescription?: string;
  cancelReply?: boolean;
  finalLayer?: boolean;
  once?: boolean;
  flagsFilter?: string;
  roleFilter?: string;
}

export interface VoxtaActionEffectDto {
  setFlags?: string[];
  clearFlags?: string[];
}

export interface VoxtaFunctionArgumentDefinitionDto {
  name: string;
  type: VoxtaFunctionArgumentTypeDto;
  description?: string;
  required?: boolean;
}

export type VoxtaFunctionArgumentTypeDto = 'Undefined' | 'String' | 'Integer' | 'Double' | 'Boolean';

export type VoxtaFunctionTimingDto =
| 'AfterUserMessage'
| 'BeforeAssistantMessage'
| 'AfterAssistantMessage'
| 'Manual'
| 'Button'
| 'AfterAnyMessage';

