import type { ActorIntent } from "../plan/planDefs"

/** The fields any of the behaviour-tree leaves might need, resolved from the
 *  originating intent by a {@link BehaviorDefinition}'s `toParams`. Different
 *  intents fill different subsets. Consumed by
 *  {@link import("./CharacterBehaviorAgent").CharacterBehaviorAgent}. */
export interface BehaviorParams {
    actorId: string
    /** Pose/clothing subject, or the character to walk to (goto-character). */
    targetId?: string
    locationId?: string
    subLocationId?: string
    poseId?: string
    clothingId?: string
    stateId?: string
    actorPartTag?: string
    targetPartTag?: string
    verb?: string
}

/** One intent type's behaviour: the MDSL tree it drives and how to flatten the
 *  concrete intent into {@link BehaviorParams}. Lives next to the intent in its
 *  domain `behavior/` folder; collected by {@link import("./BehaviorRegistry").BehaviorRegistry}
 *  via the {@link BEHAVIOR_DEFINITION} token. `toParams` takes the base
 *  {@link ActorIntent} and casts to its concrete intent internally. */
export interface BehaviorDefinition {
    /** The intent `type` discriminant this definition handles. */
    readonly type: string
    /** Fully-composed MDSL (including any subtrees it references). */
    readonly tree: string
    toParams(intent: ActorIntent): BehaviorParams
}

/** Multi-injection token: every {@link BehaviorDefinition} is registered under
 *  this in `SimProvisioner` and collected with `@injectAll`. */
export const BEHAVIOR_DEFINITION = Symbol("behavior.definition")
