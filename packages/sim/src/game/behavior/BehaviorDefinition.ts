/** One intent type's behaviour: just the MDSL tree it drives. Lives next to the
 *  intent in its domain `behavior/` folder; collected by
 *  {@link import("./BehaviorRegistry").BehaviorRegistry} via the
 *  {@link BEHAVIOR_DEFINITION} token. Leaves read the originating intent directly
 *  off the {@link import("./BehaviorContext").BehaviorContext} (cast to the role
 *  interface they need), so there is no intent→params flattening step. */
export interface BehaviorDefinition {
    /** The intent `type` discriminant this definition handles. */
    readonly type: string
    /** Fully-composed MDSL (including any subtrees it references). */
    readonly tree: string
}

/** Multi-injection token: every {@link BehaviorDefinition} is registered under
 *  this in `SimProvisioner` and collected with `@injectAll`. */
export const BEHAVIOR_DEFINITION = Symbol("behavior.definition")
