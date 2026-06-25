import { ActorIntent, TargetedIntent } from "../../../../plan/planDefs";

export const GOTO_CHARACTER_INTENT = 'goToCharacter'

export interface GoToCharacterIntent extends ActorIntent, TargetedIntent {
    type: typeof GOTO_CHARACTER_INTENT
}

export const goToCharacterIntent = (actorId: string, characterId: string): GoToCharacterIntent => ({
    kind: 'intent', type: GOTO_CHARACTER_INTENT, actorId, targetId: characterId,
})

