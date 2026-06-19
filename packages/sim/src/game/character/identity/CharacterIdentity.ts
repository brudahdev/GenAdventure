import { CharacterConfig, SimStartCharacterData } from "@gen-adventure/shared"
import { defineKey } from "../../../core/ec/ComponentKey"
import { defineFactory } from "../../../core/ec/ComponentFactory"
import { CHARACTER_CONFIG_ADAPTER, type CharacterConfigAdapter } from "../CharacterConfigAdapter"
import { INIT_CHARACTERS } from "../../entity/initCharacters"


/** Holds the character's static configuration (pronouns, appearance entries,
 *  arousal/anatomy). Replaces `Character.fetchCharacterConfig()`: the player
 *  blueprint attaches a default config, the npc blueprint one from the config
 *  adapter — the only real fork between the two character kinds. A data-only
 *  component, so it implements no lifecycle hooks. */
export const CharacterIdentityKey = defineKey<CharacterIdentity>("character.identity")
export class CharacterIdentity {
    constructor(readonly config: CharacterConfig, readonly name: string) { }
}

//todo load from persona
const DEFAULT_PLAYER_CONFIG: CharacterConfig = {
    "pronouns": {
        "heShe": "he",
        "himHer": "him",
        "hisHer": "his"
    },
    "appearanceEntryIds": [
        "race_caucasian",
        "male",
        "hair_style_braid"
    ],
    "arousalData": {
        "vaginal_sex_tto": 2,
        "anal_sex_tto": 2,
        "fingering_anus_tto": 4,
        "orgasm_time": 30,
        "squirt_time": 10,
        "fingering_tto": 4
    },
    "hasTits": false,
    "hasPenis": true
}

//todo load from persona
const DEFAULT_PLAYER_NAME = "{{user}}"

/** Attaches the player's identity from a built-in default config. */
export const playerIdentityFactory = defineFactory(CharacterIdentityKey, () =>
    new CharacterIdentity(DEFAULT_PLAYER_CONFIG, DEFAULT_PLAYER_NAME))

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
