import { pending, type Command } from "../../../../core/plan/planTypes";

export const GO_TO_COMMAND = 'goToCmd';
export interface GoToCommand extends Command {
    type: typeof GO_TO_COMMAND
    actorId: string
    locationId: string
}
export const goToCommand = (
    actorId: string,
    locationId: string,
): GoToCommand => ({
    kind: 'command', type: GO_TO_COMMAND, status: pending(), actorId, locationId,
})

