import { Lifecycle, scoped } from "tsyringe"
import { GO_TO_COMMAND, GoToCommand } from "./GoToCommand"
import { CommandSystem } from "../../../../core/plan/CommandSystem"
import { EntityRegistry } from "../../../entity/EntityRegistry"
import { CommandStatus, completed, invalid, ok, Validation } from "../../../../core/plan/planTypes"
import { isStanding } from "../../../plan/poseGuards"
import { CharacterLocomotionKey } from "../CharacterLocomotion"

@scoped(Lifecycle.ContainerScoped)
export class GoToCommandSystem implements CommandSystem<GoToCommand> {
    readonly type = GO_TO_COMMAND

    constructor(private readonly registry: EntityRegistry) { }

    validate(cmd: GoToCommand): Validation {
        const actor = this.registry.getById(cmd.actorId)
        if (!actor) return invalid(`actor ${cmd.actorId} not found`)
        // Mirrors the decomposer's Stand guard — the safety net against drift
        // (e.g. knocked down mid-walk once movement is time-extended).
        if (!isStanding(actor)) return invalid(`${cmd.actorId} must be standing to move`)
        if (!actor.require(CharacterLocomotionKey).findNearbyLocationById(cmd.locationId)) {
            return invalid(`'${cmd.locationId}' is not reachable from ${cmd.actorId}'s current location`)
        }
        return ok()
    }

    execute(cmd: GoToCommand): CommandStatus {
        this.registry.requireById(cmd.actorId).require(CharacterLocomotionKey).gotoNearbyLocation(cmd.locationId)
        return completed()
    }
}
