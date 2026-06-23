import { Lifecycle, scoped } from "tsyringe"
import { BehaviourTree } from "mistreevous"
import { EntityRegistry } from "../entity/EntityRegistry"
import { LocationManager } from "../location/LocationManager"
import { NotificationService } from "../../core/NotificationService"
import { BehaviorTreeRunner, type OnSettle } from "../../core/bt/BehaviorTreeRunner"
import { CharacterBehaviorAgent, type BehaviorParams } from "./CharacterBehaviorAgent"
import { TREES } from "./behaviorTrees"
import type { ActorIntent } from "../plan/planDefs"
import { POSE_INTENT, type PoseIntent } from "../character/pose/behavior/PoseIntent"
import { GO_TO_INTENT, type GoToIntent } from "../character/locomotion/behavior/GoToIntent"
import { GOTO_CHARACTER_INTENT, type GoToCharacterIntent } from "../character/locomotion/behavior/GoToCharacter/GoToCharacter"
import { ALTER_CLOTHING_STATE_INTENT, type AlterClothingStateIntent } from "../character/clothing/behavior/AlterClothingStateIntent"

/** mistreevous does not export its `Agent` type, so derive the constructor's
 *  expected agent type from `BehaviourTree` itself for the cast below. */
type MistreevousAgent = ConstructorParameters<typeof BehaviourTree>[1]

/** The intent layer's entry point — the BT replacement for the old
 *  `PlanExecutor`. Maps an {@link ActorIntent} to its MDSL tree
 *  (`behaviorTrees.ts`), builds a per-submission {@link CharacterBehaviorAgent},
 *  and hands the tree to the {@link BehaviorTreeRunner}, which steps it across
 *  ticks. Both intent sources (worker UI actions, Voxta inference actions) funnel
 *  through `submit`. `onSettle` fires when the tree finishes (used for avatar
 *  regeneration that the old code did on a synchronous `'completed'`). */
@scoped(Lifecycle.ContainerScoped)
export class BehaviorDispatcher {
    constructor(
        private readonly registry: EntityRegistry,
        private readonly locationManager: LocationManager,
        private readonly notificationService: NotificationService,
        private readonly runner: BehaviorTreeRunner,
    ) { }

    submit(intent: ActorIntent, onSettle?: OnSettle): void {
        const mdsl = TREES[intent.type]
        if (!mdsl) {
            console.warn(`[behavior] no tree registered for intent '${intent.type}'`)
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
            this.toParams(intent),
        )
        const tree = new BehaviourTree(mdsl, agent as unknown as MistreevousAgent)
        this.runner.start(intent.actorId, tree, onSettle)
    }

    /** Flatten the concrete intent's fields into the shape the agent reads. */
    private toParams(intent: ActorIntent): BehaviorParams {
        switch (intent.type) {
            case POSE_INTENT: {
                const i = intent as PoseIntent
                return { actorId: i.actorId, targetId: i.targetId, poseId: i.poseId }
            }
            case GO_TO_INTENT: {
                const i = intent as GoToIntent
                return { actorId: i.actorId, locationId: i.locationId, subLocationId: i.subLocationId }
            }
            case GOTO_CHARACTER_INTENT: {
                const i = intent as GoToCharacterIntent
                return { actorId: i.actorId, targetId: i.characterId }
            }
            case ALTER_CLOTHING_STATE_INTENT: {
                const i = intent as AlterClothingStateIntent
                return { actorId: i.actorId, targetId: i.targetId, clothingId: i.clothingId, stateId: i.stateId }
            }
            default:
                return { actorId: intent.actorId }
        }
    }
}
