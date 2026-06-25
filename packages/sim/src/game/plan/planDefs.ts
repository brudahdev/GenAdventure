import type { Intent } from "../../core/plan/planTypes"

/** An intent owned by a specific actor — the actor whose behaviour tree the
 *  {@link import("../behavior/BehaviorDispatcher").BehaviorDispatcher} starts.
 *  Concrete intents (pose, goto, goto-character, clothing) extend this with their
 *  own fields in the per-aspect `behavior/` `*Intent` files. */
export interface ActorIntent extends Intent {
    actorId: string
}

/** Role slice for any intent directed at another character (or self). The shared
 *  `GoToCharacter` subtree's leaves read the intent through this, so every
 *  target-directed intent (pose, clothing, touch, goto-character) implements it —
 *  this is the shared vocabulary that lets those subtrees be reused. */
export interface TargetedIntent {
    targetId: string
}
