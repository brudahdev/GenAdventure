import { Lifecycle, scoped } from "tsyringe";
import { Decomposer } from "../../../../core/plan/Decomposer";
import { AlterClothingStateIntent } from "../../clothing/behavior/AlterClothingStateIntent";
import { POSE_INTENT, PoseIntent } from "./PoseIntent";
import { EntityRegistry } from "../../../entity/EntityRegistry";
import { PlanEntry } from "../../../../core/plan/planTypes";
import { goToCharacterIntent } from "../../../plan/planDefs";
import { CharacterLocationKey } from "../../location/CharacterLocation";
import { poseCommand } from "./PoseCommand";

@scoped(Lifecycle.ContainerScoped)
export class PoseDecomposer implements Decomposer<PoseIntent> {
    readonly type = POSE_INTENT

    constructor(private readonly registry: EntityRegistry) { }


    decompose(intent: PoseIntent): PlanEntry[] {
        const seq: PlanEntry[] = []

        const actor = this.registry.getById(intent.actorId)
        if (actor && !actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(intent.targetId)) {
            seq.push(goToCharacterIntent(intent.actorId, intent.targetId))
        }

        seq.push(poseCommand(intent.actorId, intent.targetId, intent.poseId))
        return seq
    }
}