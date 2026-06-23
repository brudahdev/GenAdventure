import { CharacterConfig, SimStartCharacterData } from "@gen-adventure/shared"
import { defineKey } from "../../../core/ec/ComponentKey"
import { defineFactory } from "../../../core/ec/ComponentFactory"
import { CHARACTER_CONFIG_ADAPTER, type CharacterConfigAdapter } from "../CharacterConfigAdapter"
import { PLAYER_PERSONA_CONFIG_ADAPTER, type PlayerPersonaConfigAdapter } from "../PlayerPersonaConfigAdapter"
import { STARTING_STATE_ADAPTER, type StartingStateAdapter } from "../StartingStateAdapter"
import { INIT_CHARACTERS } from "../../entity/initCharacters"
import { USER_NAME } from "./userName"


/** Holds the character's static configuration (pronouns, appearance entries,
 *  arousal/anatomy). Replaces `Character.fetchCharacterConfig()`: the player
 *  blueprint attaches a default config, the npc blueprint one from the config
 *  adapter — the only real fork between the two character kinds. A data-only
 *  component, so it implements no lifecycle hooks. */
export const CharacterIdentityKey = defineKey<CharacterIdentity>("character.identity")
export class CharacterIdentity {
    constructor(readonly config: CharacterConfig, readonly name: string) { }
}

/** Attaches the player's identity: the persona config selected by the player
 *  role's `personaId` (from `roles.json`, role order -1), loaded from
 *  `player_personas.json`, with the name resolved from the run's `USER_NAME`
 *  (the scenario impersonation / logged-in Voxta user, see `SimStartData.userName`). */
export const playerIdentityFactory = defineFactory(CharacterIdentityKey, (entity, c) => {
    const startingState = c.resolve<StartingStateAdapter>(STARTING_STATE_ADAPTER)
    const personaId = startingState.getRoleConfig(entity.id).personaId
    if (personaId === undefined) {
        throw new Error("player role config has no personaId")
    }
    const personas = c.resolve<PlayerPersonaConfigAdapter>(PLAYER_PERSONA_CONFIG_ADAPTER)
    const userName = c.resolve<string>(USER_NAME)
    return new CharacterIdentity(personas.getConfig(personaId), userName)
})

/** Attaches an npc's identity: static config from the per-character config
 *  adapter, plus the persona name carried in the run's `INIT_CHARACTERS`. */
export const npcIdentityFactory = defineFactory(CharacterIdentityKey, (entity, c) => {
    const characters = c.resolve<SimStartCharacterData[]>(INIT_CHARACTERS)
    const name = characters.find(character => character.characterId === entity.id)?.name
    if (name === undefined) {
        throw new Error("unable to find name for characterId " + entity.id)
    }
    const characterConfig = c.resolve<CharacterConfigAdapter>(CHARACTER_CONFIG_ADAPTER)
    return new CharacterIdentity(characterConfig.getConfig(entity.id), name)
})
