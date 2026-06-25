import { State } from "mistreevous"
import type { BehaviorContext, LeafSet } from "../../../../behavior/BehaviorContext"
import { TouchManagerKey } from "../TouchManager"
import type { TouchIntent } from "./TouchIntent"

/** Touch leaf: apply a touch interaction. Movement to the target is handled
 *  upstream by the shared goto-character subtree (which short-circuits for a
 *  co-located/self touch). */
export const TOUCH_LEAVES: LeafSet = {
    leaves: {
        Touch(ctx: BehaviorContext): State {
            const { actorId, targetId, actorPartTag, targetPartTag, verb } = ctx.intent as TouchIntent
            const actor = ctx.deps.registry.getById(actorId)
            if (!actor) return State.FAILED

            const applied = actor.require(TouchManagerKey).applyTouch({
                actorId, targetId, actorPartTag, targetPartTag, verb,
            })
            return applied ? State.SUCCEEDED : State.FAILED
        },
    },
}
