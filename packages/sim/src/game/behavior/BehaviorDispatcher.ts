import { Lifecycle, scoped } from "tsyringe"
import { BehaviourTree } from "mistreevous"
import { EntityRegistry } from "../entity/EntityRegistry"
import { LocationManager } from "../location/LocationManager"
import { NotificationService } from "../../core/NotificationService"
import { BehaviorTreeRunner, type OnSettle } from "../../core/bt/BehaviorTreeRunner"
import { CharacterBehaviorAgent } from "./CharacterBehaviorAgent"
import { BehaviorRegistry } from "./BehaviorRegistry"
import type { ActorIntent } from "../plan/planDefs"

/** mistreevous does not export its `Agent` type, so derive the constructor's
 *  expected agent type from `BehaviourTree` itself for the cast below. */
type MistreevousAgent = ConstructorParameters<typeof BehaviourTree>[1]

/** The intent layer's entry point — the BT replacement for the old
 *  `PlanExecutor`. Looks an intent's {@link import("./BehaviorDefinition").BehaviorDefinition}
 *  up in the {@link BehaviorRegistry} (its tree + param-mapping live in the
 *  intent's domain `behavior/` folder), builds a per-submission
 *  {@link CharacterBehaviorAgent}, and hands the tree to the
 *  {@link BehaviorTreeRunner}, which steps it across ticks. Both intent sources
 *  (worker UI actions, Voxta inference actions) funnel through `submit`.
 *  `onSettle` fires when the tree finishes (used for avatar regeneration that the
 *  old code did on a synchronous `'completed'`). */
@scoped(Lifecycle.ContainerScoped)
export class BehaviorDispatcher {
    constructor(
        private readonly registry: EntityRegistry,
        private readonly locationManager: LocationManager,
        private readonly notificationService: NotificationService,
        private readonly runner: BehaviorTreeRunner,
        private readonly behaviors: BehaviorRegistry,
    ) { }

    submit(intent: ActorIntent, onSettle?: OnSettle): void {
        const def = this.behaviors.get(intent.type)
        if (!def) {
            console.warn(`[behavior] no definition registered for intent '${intent.type}'`)
            onSettle?.(false)
            return
        }

        const actor = this.registry.getById(intent.actorId)
        if (!actor) {
            console.warn(`[behavior] cannot submit '${intent.type}': actor ${intent.actorId} not found`)
            onSettle?.(false)
            return
        }

        const agent = new CharacterBehaviorAgent(
            {
                registry: this.registry,
                locationManager: this.locationManager,
                notificationService: this.notificationService,
            },
            def.toParams(intent),
        )
        const tree = new BehaviourTree(def.tree, agent as unknown as MistreevousAgent)
        this.runner.start(intent.actorId, tree, onSettle, def.tree)
    }
}
