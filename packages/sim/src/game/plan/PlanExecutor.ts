import { Lifecycle, scoped } from "tsyringe"
import type { CommandSystem } from "../../core/plan/CommandSystem"
import type { Decomposer } from "../../core/plan/Decomposer"
import type { PlanStatus } from "../../core/plan/planTypes"
import { advancePlan } from "../../core/plan/planWalk"
import { ActorPlanKey } from "../../core/plan/ActorPlan"
import { EntityRegistry } from "../entity/EntityRegistry"
import type { ActorIntent } from "./planDefs"
import { PoseCommandSystem } from "../character/pose/behavior/PoseCommandSystem"
import { GoToNearbyLocationCommandSystem } from "./GoToNearbyLocationCommandSystem"
import { AlterClothingStateCommandSystem } from "../character/clothing/behavior/AlterClothingStateCommandSystem"
import { GoToCharacterDecomposer } from "./GoToCharacterDecomposer"
import { AlterClothingStateDecomposer } from "../character/clothing/behavior/AlterClothingStateDecomposer"
import { PoseDecomposer } from "../character/pose/behavior/PoseDecomposer"


/** The intent/command layer's entry point. Constructor-injects every concrete
 *  command-system and decomposer (so resolving the executor wires them up) and
 *  keys them by `type` into two registry maps — the "registry" is just data.
 *  {@link submit} appends an intent to its actor's plan and drives the cursor
 *  walk as far as it goes right now. */
@scoped(Lifecycle.ContainerScoped)
export class PlanExecutor {
    private readonly commands = new Map<string, CommandSystem>()
    private readonly decomposers = new Map<string, Decomposer>()

    constructor(
        private readonly registry: EntityRegistry,
        poseCommand: PoseCommandSystem,
        goToNearbyLocationCommand: GoToNearbyLocationCommandSystem,
        alterClothingStateCommand: AlterClothingStateCommandSystem,
        goToCharacterDecomposer: GoToCharacterDecomposer,
        alterClothingStateDecomposer: AlterClothingStateDecomposer,
        poseDecomoser: PoseDecomposer,
    ) {
        for (const system of [poseCommand, goToNearbyLocationCommand, alterClothingStateCommand]) {
            this.register(this.commands, system.type, system)
        }
        for (const decomposer of [goToCharacterDecomposer, alterClothingStateDecomposer, poseDecomoser]) {
            this.register(this.decomposers, decomposer.type, decomposer)
        }
    }

    /** Queue a top-level intent on its actor's {@link ActorPlanKey} plan and
     *  advance. Returns the resulting plan status (handlers regenerate avatars on
     *  `completed`). */
    submit(intent: ActorIntent): PlanStatus {
        const actor = this.registry.getById(intent.actorId)
        if (!actor) {
            const reason = `cannot submit intent '${intent.type}': actor ${intent.actorId} not found`
            console.warn(`[plan] ${reason}`)
            return { state: 'failed', reason }
        }

        const plan = actor.require(ActorPlanKey)
        plan.append(intent)
        return advancePlan(plan, this.commands, this.decomposers)
    }

    private register<T>(map: Map<string, T>, type: string, value: T): void {
        if (map.has(type)) {
            throw new Error(`plan: a system is already registered for type "${type}"`)
        }
        map.set(type, value)
    }
}
