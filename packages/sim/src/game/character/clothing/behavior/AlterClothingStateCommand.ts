import { pending, type Command } from "../../../../core/plan/planTypes";

export const ALTER_CLOTHING_STATE_COMMAND = 'alterClothingStateCmd';
export interface AlterClothingStateCommand extends Command {
    type: typeof ALTER_CLOTHING_STATE_COMMAND
    actorId: string
    targetId: string
    clothingId: string
    stateId: string
}
export const alterClothingStateCommand = (
    actorId: string,
    targetId: string,
    clothingId: string,
    stateId: string
): AlterClothingStateCommand => ({
    kind: 'command', type: ALTER_CLOTHING_STATE_COMMAND, status: pending(), actorId, targetId, clothingId, stateId,
})

