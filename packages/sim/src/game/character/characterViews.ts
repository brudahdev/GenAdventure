import { PromptRequest } from "@gen-adventure/shared"
import type { Entity } from "../../core/ec/Entity"
import { PromptBuilder } from "../../core/PromptBuilder"
import { ClothingManagerKey } from "./clothing/ClothingManager"
import { AppearanceKey } from "./appearance/CharacterAppearance"
import { CharacterPoseKey } from "./pose/CharacterPose"
import { CharacterLocationKey } from "./location/CharacterLocation"
import { CharacterIdentityKey } from "./identity/CharacterIdentity"
import { TouchManagerKey } from "./body/touch/TouchManager"
import { BodyKey } from "./body/Body"


/** Read-only projections over a character entity's components: builds the avatar
 *  and background image prompts by reading from the entity's components. */

export function getName(entity: Entity): string {
    return entity.require(CharacterIdentityKey).name
}

export function buildAvatarPrompt(entity: Entity): PromptRequest {//todo check if npc is active
    const prompt = new PromptBuilder(',')
    const heShe = entity.require(CharacterIdentityKey).config.pronouns.heShe;
    if (heShe == 'he') {
        prompt.addToPos('1boy')
    } else if (heShe == 'she') {
        prompt.addToPos('1girl')
    } else {
        prompt.addToPos('1person')
    }
    entity.require(CharacterPoseKey).buildAvatarImage(prompt)
    entity.require(AppearanceKey).buildAvatarImage(prompt)
    entity.require(BodyKey).buildAvatarImage(prompt)
    entity.require(ClothingManagerKey).buildAvatarImage(prompt)

    return {
        type: 'avatar',
        characterId: entity.id,
        positive: prompt.getPositive(),
        negative: prompt.getNegative(),
        aspectRatio: { width: 2, height: 3 },
    }
}

export function buildBackgroundPrompt(entity: Entity): PromptRequest {
    return entity.require(CharacterLocationKey).getCurrentSubLocation().getParent().getBackgroundPrompt()
}
