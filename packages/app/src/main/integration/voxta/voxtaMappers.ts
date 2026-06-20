import {
  PLAYER_CHARACTER_ID,
  type CharacterDetail,
  type InferenceAction,
  type VoxtaCharacterSummary,
  type VoxtaScenarioRole,
  type VoxtaScenarioSummary
} from '@gen-adventure/shared'
import type {
  CharacterCardDto,
  CharacterDto,
  ScenarioDto,
  ScenarioRoleDto,
  VoxtaScenarioActionDto,
  VoxtaFunctionTimingDto
} from './voxtaDtos'

/**
 * Dedicated DTO → domain mappers. The single place where Voxta's wire format is
 * translated into the clean models the rest of the app (and the UI) consumes.
 */

export function mapCharacter(dto: CharacterDto): VoxtaCharacterSummary {
  return {
    id: dto.id,
    name: dto.name,
    thumbnailUrl: dto.thumbnailUrl ?? ''
  }
}

/** `id` is the requested character id (the card uses `localId`, not a top-level `id`). */
export function mapCharacterDetail(dto: CharacterCardDto, id: string): CharacterDetail {
  return {
    id,
    name: dto.name
  }
}

/** `index` becomes the role's `roleOrder`, preserving its position in the list. */
export function mapRole(dto: ScenarioRoleDto, index: number): VoxtaScenarioRole {
  return {
    roleName: dto.name,
    description: dto.description ?? '',
    roleOrder: index,
    defaultCharacterId: dto.defaultCharacterId
  }
}

export function mapScenario(dto: ScenarioDto): VoxtaScenarioSummary {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? '',
    roles: (dto.roles ?? []).map(mapRole)
  }
}

/** Outbound: when an inference action fires relative to a message turn.
 *  The player's actions are inferred after their own message; a character's
 *  actions fire before or after the assistant message per the action's `before`. */
function actionTiming(action: InferenceAction): VoxtaFunctionTimingDto {
  if (action.characterId === PLAYER_CHARACTER_ID) return 'AfterUserMessage'
  return action.before ? 'BeforeAssistantMessage' : 'AfterAssistantMessage'
}

/** Outbound: domain inference action → Voxta scenario-action wire DTO. The
 *  argument shape is 1:1, so it passes through unchanged. */
export function mapInferenceActionToScenarioActionDto(action: InferenceAction): VoxtaScenarioActionDto {
  return {
    name: action.name,
    description: action.description,
    disabled: false,
    layer: action.layer,
    arguments: (action.arguments ?? []).map((arg) => ({
      name: arg.name,
      type: arg.type,
      description: arg.description,
      required: arg.required
    })),
    timing: actionTiming(action),
    effect: {},
    shortDescription: action.shortDescription
  }
}
