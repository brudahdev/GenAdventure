import type { State } from "mistreevous"
import type { EntityRegistry } from "../entity/EntityRegistry"
import type { LocationManager } from "../location/LocationManager"
import type { NotificationService } from "../../core/NotificationService"
import type { ActorIntent } from "../plan/planDefs"
import type { CharacterActionNotifier } from "./CharacterActionNotifier"

/** Shared services every behaviour-tree leaf reads from. Built once per submitted
 *  intent in {@link import("./BehaviorDispatcher").BehaviorDispatcher} and carried
 *  on the {@link BehaviorContext}. */
export interface BehaviorDeps {
    registry: EntityRegistry
    locationManager: LocationManager
    notificationService: NotificationService
}

/** The per-submission context handed to every leaf: the run's services
 *  ({@link BehaviorDeps}), the originating {@link ActorIntent} (each leaf casts it
 *  to the role interface it needs — `TargetedIntent`, `LocatedIntent`, …), and the
 *  prose {@link CharacterActionNotifier} (one per submission). Leaves read live
 *  world state off `deps.registry` on every step. */
export interface BehaviorContext {
    deps: BehaviorDeps
    intent: ActorIntent
    notifier: CharacterActionNotifier
}

/** A single behaviour-tree leaf (action or condition). Actions return a
 *  mistreevous {@link State}; conditions return a boolean. `args` carries any
 *  MDSL leaf arguments (none today — var-arg'd so future `action [X, "y"]` leaves
 *  work without touching this signature). */
export type LeafImpl = (ctx: BehaviorContext, ...args: unknown[]) => State | boolean

/** A domain's contribution of named leaves, keyed by the MDSL leaf name the
 *  trees reference (`SetPose`, `IsStanding`, …). Co-located with the domain's
 *  tree in its `behavior/` folder and collected by
 *  {@link import("./BehaviorLeafRegistry").BehaviorLeafRegistry}. */
export interface LeafSet {
    readonly leaves: Record<string, LeafImpl>
}
