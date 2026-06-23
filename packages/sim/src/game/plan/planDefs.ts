import type { Intent } from "../../core/plan/planTypes"

/** An intent owned by a specific actor — the actor whose behaviour tree the
 *  {@link import("../behavior/BehaviorDispatcher").BehaviorDispatcher} starts.
 *  Concrete intents (pose, goto, goto-character, clothing) extend this with their
 *  own fields in the per-aspect `behavior/` `*Intent` files. */
export interface ActorIntent extends Intent {
    actorId: string
}
