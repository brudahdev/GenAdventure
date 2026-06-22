import { Lifecycle, scoped } from "tsyringe"
import type { Decomposer } from "../../../../../core/plan/Decomposer"
import type { PlanEntry } from "../../../../../core/plan/planTypes"
import { EntityRegistry } from "../../../../entity/EntityRegistry"
import { LocationManager } from "../../../../location/LocationManager"
import { CharacterLocationKey } from "../../../location/CharacterLocation"
import { goToNearbyLocationCommand } from "../../../../plan/planDefs"
import { type GoToCharacterIntent } from "./GoToCharacter"
import { GOTO_CHARACTER_INTENT } from "./GoToCharacter"
import { poseCommand } from "../../../pose/behavior/PoseCommand"
import { calcPath } from "../../../../plan/locationPath"
import { isStanding, standPoseId } from "../../../../plan/poseGuards"
import { goToIntent } from "../GoToIntent"

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
        const targetLocation = target.require(CharacterLocationKey)
        if (actorLocation.isAtSameSubLocationAsOther(intent.characterId)) return []

        const seq: PlanEntry[] = []

        seq.push(goToIntent(actor.id, targetLocation.getCurrentLocation().id, targetLocation.getCurrentSubLocation().id))

        return seq
    }
}
