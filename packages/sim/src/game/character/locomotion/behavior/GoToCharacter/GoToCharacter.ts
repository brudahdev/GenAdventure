import { ActorIntent } from "../../../../plan/planDefs";

export const GOTO_CHARACTER_INTENT = 'goToCharacter'

export interface GoToCharacterIntent extends ActorIntent {
    type: typeof GOTO_CHARACTER_INTENT
    characterId: string
}

export const goToCharacterIntent = (actorId: string, characterId: string): GoToCharacterIntent => ({
    kind: 'intent', type: GOTO_CHARACTER_INTENT, actorId, characterId,
})

