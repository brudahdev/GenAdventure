import { Lifecycle, scoped } from "tsyringe"
import type { Decomposer } from "../../core/plan/Decomposer"
import type { PlanEntry } from "../../core/plan/planTypes"
import { EntityRegistry } from "../entity/EntityRegistry"
import { LocationManager } from "../location/LocationManager"
import { CharacterLocationKey } from "../character/location/CharacterLocation"
import { GOTO_CHARACTER_INTENT, goToNearbyLocationCommand, poseCommand, type GoToCharacterIntent } from "./planDefs"
import { calcPath } from "./locationPath"
import { isStanding, standPoseId } from "./poseGuards"

/** Expands "go to a character" into: stand up (if not already standing — you must
 *  be upright to move), then one move command per hop on the BFS path to the
 *  target's sub-location. Already co-located → nothing to do. */
@scoped(Lifecycle.ContainerScoped)
export class GoToCharacterDecomposer implements Decomposer<GoToCharacterIntent> {
    readonly type = GOTO_CHARACTER_INTENT

    constructor(
        private readonly registry: EntityRegistry,
        private readonly locationManager: LocationManager,
    ) { }

    decompose(intent: GoToCharacterIntent): PlanEntry[] {
        const actor = this.registry.getById(intent.actorId)
        const target = this.registry.getById(intent.characterId)
        if (!actor || !target) return []

        const actorLocation = actor.require(CharacterLocationKey)
        if (actorLocation.isAtSameSubLocationAsOther(intent.characterId)) return []

        const seq: PlanEntry[] = []

        // Must be standing to move.
        if (!isStanding(actor)) {
            const standId = standPoseId(actor)
            if (standId) seq.push(poseCommand(intent.actorId, standId))
        }

        const path = calcPath(
            this.locationManager,
            actorLocation.getCurrentSubLocation(),
            target.require(CharacterLocationKey).getCurrentSubLocation(),
        )
        for (const step of path) {
            seq.push(goToNearbyLocationCommand(intent.actorId, step))
        }

        return seq
    }
}
