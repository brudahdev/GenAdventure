import type { ActorIntent } from "../../../plan/planDefs"
import type { BehaviorDefinition } from "../../../behavior/BehaviorDefinition"
import { STAND_UP_SUBTREE } from "../../pose/behavior/standUpSubtree"
import { GO_TO_INTENT, type GoToIntent } from "./GoToIntent"

/** Walk to the intent's fixed location, standing first. `HopTowardLocation` is
 *  one hop per step (`RUNNING` until arrived); the `while(IsStanding)` guard keeps
 *  the move bound to the actor being upright. */
const GO_TO_LOCATION_TREE = `
root {
    sequence {
        branch [StandUp]
        action [HopTowardLocation] while(IsStanding)
    }
}
${STAND_UP_SUBTREE}`

/** Behaviour for the {@link GoToIntent}. */
export const GO_TO_BEHAVIOR: BehaviorDefinition = {
    type: GO_TO_INTENT,
    tree: GO_TO_LOCATION_TREE,
    toParams: (intent: ActorIntent) => {
        const i = intent as GoToIntent
        return { actorId: i.actorId, locationId: i.locationId, subLocationId: i.subLocationId }
    },
}
