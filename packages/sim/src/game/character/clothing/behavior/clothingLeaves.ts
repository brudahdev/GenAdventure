import { State } from "mistreevous"
import type { BehaviorContext, LeafSet } from "../../../behavior/BehaviorContext"
import { CharacterLocationKey } from "../../location/CharacterLocation"
import { ClothingManagerKey } from "../ClothingManager"
import type { AlterClothingStateIntent } from "./AlterClothingStateIntent"

/** Clothing leaf: alter the (co-located) target's clothing item state. Movement
 *  to the target is handled upstream by the shared goto-character subtree. */
export const CLOTHING_LEAVES: LeafSet = {
    leaves: {
        AlterClothing(ctx: BehaviorContext): State {
            const { actorId, targetId, clothingId, stateId } = ctx.intent as AlterClothingStateIntent
            const actor = ctx.deps.registry.getById(actorId)
            const target = ctx.deps.registry.getById(targetId)
            if (!actor || !target) return State.FAILED
            if (!actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(target.id)) {
                return State.FAILED
            }

            const item = target.require(ClothingManagerKey).getClothingItemById(clothingId)
            if (!item) return State.FAILED
            if (!item.getStateIds().includes(stateId)) return State.FAILED

            const futureState = item.getStateById(stateId)!
            ctx.notifier.notifyClothing(actor.id, target.id, futureState)
            return item.setStateById(stateId) ? State.SUCCEEDED : State.FAILED
        },
    },
}
