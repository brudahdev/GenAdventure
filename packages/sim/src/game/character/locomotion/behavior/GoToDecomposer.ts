import { Lifecycle, scoped } from "tsyringe"
import { Decomposer } from "../../../../core/plan/Decomposer"
import { GO_TO_INTENT, GoToIntent } from "./GoToIntent"
import { EntityRegistry } from "../../../entity/EntityRegistry"
import { PlanEntry } from "../../../../core/plan/planTypes"
import { goToCommand } from "./GoToCommand"

@scoped(Lifecycle.ContainerScoped)
export class GoToDecomposer implements Decomposer<GoToIntent> {
    readonly type = GO_TO_INTENT

    constructor(private readonly registry: EntityRegistry) { }

    decompose(intent: GoToIntent): PlanEntry[] {
        const seq: PlanEntry[] = []

        const actor = this.registry.getById(intent.actorId)
        // if (actor && !actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(intent.targetId)) {
        //     seq.push(goToCharacterIntent(intent.actorId, intent.targetId))
        // }

        seq.push(goToCommand(intent.actorId, intent.targetId))
        return seq
    }
}