import { Lifecycle, scoped } from "tsyringe"
import type { CommandSystem } from "../../core/plan/CommandSystem"
import { completed, invalid, ok, type CommandStatus, type Validation } from "../../core/plan/planTypes"
import { EntityRegistry } from "../entity/EntityRegistry"
import { CharacterLocomotionKey } from "../character/locomotion/CharacterLocomotion"
import { GOTO_NEARBY_LOCATION_COMMAND, type GoToNearbyLocationCommand } from "./planDefs"
import { isStanding } from "./poseGuards"

/** Moves an actor one hop: to a sub-location in the current location, or across a
 *  LocationLink to a connected location's default sub-location.
 *
 *  Instant today. FUTURE: a cross-LocationLink hop will return `running()` from
 *  `execute` and schedule a `ScheduledEvent`; `continue()`/`stillValid()` then
 *  drive it to `completed` over game time, holding the cursor while it travels. */
@scoped(Lifecycle.ContainerScoped)
export class GoToNearbyLocationCommandSystem implements CommandSystem<GoToNearbyLocationCommand> {
    readonly type = GOTO_NEARBY_LOCATION_COMMAND

    constructor(private readonly registry: EntityRegistry) { }

    validate(cmd: GoToNearbyLocationCommand): Validation {
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

    execute(cmd: GoToNearbyLocationCommand): CommandStatus {
        this.registry.requireById(cmd.actorId).require(CharacterLocomotionKey).gotoNearbyLocation(cmd.locationId)
        return completed()
    }
}
