import { State } from "mistreevous"
import type { BehaviorContext, LeafSet } from "../../../behavior/BehaviorContext"
import type { ActorIntent, TargetedIntent } from "../../../plan/planDefs"
import { CharacterLocationKey } from "../../location/CharacterLocation"
import { CharacterLocomotion } from "../CharacterLocomotion"
import type { LocatedIntent } from "./GoToIntent"
import type { SubLocation } from "../../../location/SubLocation"
import type { Location } from "../../../location/Location"

/** Locomotion leaves: one-hop movement toward a fixed location or a (reactive)
 *  target character, plus the co-location guard the goto-character subtree uses.
 *  `IsCoLocatedWithTarget`/`HopTowardTarget` are driven by several intents, so
 *  they read the shared {@link TargetedIntent} role rather than a concrete intent. */
export const LOCOMOTION_LEAVES: LeafSet = {
    leaves: {
        IsCoLocatedWithTarget(ctx: BehaviorContext): boolean {
            const { actorId, targetId } = ctx.intent as ActorIntent & TargetedIntent
            const actor = ctx.deps.registry.getById(actorId)
            if (!actor) return false
            return actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(targetId)
        },

        HopTowardLocation(ctx: BehaviorContext): State {
            const { actorId, locationId, subLocationId } = ctx.intent as ActorIntent & LocatedIntent
            const actor = ctx.deps.registry.getById(actorId)
            if (!actor) return State.FAILED

            const loc = ctx.deps.locationManager.getLocationById(locationId)
            if (!loc) return State.FAILED

            const target: SubLocation | Location = subLocationId
                ? loc.getSubLocationById(subLocationId) ?? loc
                : loc
            return CharacterLocomotion.stepToward(actor, target, ctx.deps.locationManager, ctx.notifier)
        },

        HopTowardTarget(ctx: BehaviorContext): State {
            const { actorId, targetId } = ctx.intent as ActorIntent & TargetedIntent
            const actor = ctx.deps.registry.getById(actorId)
            const targetChar = ctx.deps.registry.getById(targetId)
            if (!actor || !targetChar) return State.FAILED

            if (actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(targetChar.id)) {
                return State.SUCCEEDED
            }
            const targetSub = targetChar.require(CharacterLocationKey).getCurrentSubLocation()
            return CharacterLocomotion.stepToward(actor, targetSub, ctx.deps.locationManager, ctx.notifier)
        },
    },
}
