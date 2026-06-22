import { Lifecycle, scoped } from "tsyringe"
import { Decomposer } from "../../../../core/plan/Decomposer"
import { GO_TO_INTENT, GoToIntent } from "./GoToIntent"
import { EntityRegistry } from "../../../entity/EntityRegistry"
import { PlanEntry } from "../../../../core/plan/planTypes"
import { goToCommand } from "./GoToCommand"
import { isStanding, standPoseId } from "../../../plan/poseGuards"
import { poseCommand } from "../../pose/behavior/PoseCommand"
import { calcPath } from "../../../plan/locationPath"
import { LocationManager } from "../../../location/LocationManager"
import { CharacterLocationKey } from "../../location/CharacterLocation"
import { SubLocation } from "../../../location/SubLocation"
import { Location } from "../../../location/Location"

@scoped(Lifecycle.ContainerScoped)
export class GoToDecomposer implements Decomposer<GoToIntent> {
    readonly type = GO_TO_INTENT

    constructor(
        private readonly registry: EntityRegistry,
        private readonly locationManager: LocationManager,

    ) { }

    decompose(intent: GoToIntent): PlanEntry[] {
        const seq: PlanEntry[] = []

        const actor = this.registry.getById(intent.actorId)
        if (!actor) return [] //sus
        if (!isStanding(actor)) {
            const standId = standPoseId(actor)
            if (standId) seq.push(poseCommand(intent.actorId, intent.actorId, standId))
        }

        const actorLocation = actor.require(CharacterLocationKey)

        let loc: SubLocation | Location;
        if (intent.subLocationId) {
            loc = this.locationManager.getLocationById(intent.locationId)?.getSubLocationById(intent.subLocationId)!
        } else {
            loc = this.locationManager.getLocationById(intent.locationId)!
        }

        const path = calcPath(
            this.locationManager,
            actorLocation.getCurrentSubLocation(),
            loc,
        )

        let stepCount = 0;
        for (const step of path) {
            const isFinalStep = stepCount == path.length - 1
            const stepIsSublocation = !this.locationManager.getLocationById(step)
            if (isFinalStep && stepIsSublocation) {
                seq.push(goToCommand(intent.actorId, undefined, step))
            } else {
                seq.push(goToCommand(intent.actorId, step))
            }
            stepCount++;
        }

        // seq.push(goToCommand(intent.actorId, intent.locationId))
        return seq
    }
}