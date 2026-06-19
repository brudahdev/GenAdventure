import type {
  CharacterDetail,
  VoxtaCharacterSummary,
  VoxtaScenarioRole,
  VoxtaScenarioSummary
} from '@gen-adventure/shared'
import type {
  CharacterCardDto,
  CharacterDto,
  ScenarioDto,
  ScenarioRoleDto
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
