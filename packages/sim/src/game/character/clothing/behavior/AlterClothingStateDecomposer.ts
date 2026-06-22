import { Lifecycle, scoped } from "tsyringe"
import { goToCharacterIntent } from "../../locomotion/behavior/GoToCharacter/GoToCharacter"
import { AlterClothingStateIntent } from "./AlterClothingStateIntent"
import { ALTER_CLOTHING_STATE_INTENT } from "./AlterClothingStateIntent"
import { alterClothingStateCommand } from "./AlterClothingStateCommand"
import { Decomposer } from "../../../../core/plan/Decomposer"
import { EntityRegistry } from "../../../entity/EntityRegistry"
import { PlanEntry } from "../../../../core/plan/planTypes"
import { CharacterLocationKey } from "../../location/CharacterLocation"

/** Expands "alter the target's clothing" into: walk to the target (if not already
 *  co-located), then the clothing command. The "stand up to move" guard lives in
 *  the GoToCharacter decomposer, not here. */
@scoped(Lifecycle.ContainerScoped)
export class AlterClothingStateDecomposer implements Decomposer<AlterClothingStateIntent> {
    readonly type = ALTER_CLOTHING_STATE_INTENT

    constructor(private readonly registry: EntityRegistry) { }

    decompose(intent: AlterClothingStateIntent): PlanEntry[] {
        const seq: PlanEntry[] = []

        const actor = this.registry.getById(intent.actorId)
        if (actor && !actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(intent.targetId)) {
            seq.push(goToCharacterIntent(intent.actorId, intent.targetId))
        }

        seq.push(alterClothingStateCommand(intent.actorId, intent.targetId, intent.clothingId, intent.stateId))
        return seq
    }
}
