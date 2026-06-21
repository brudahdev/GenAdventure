import type { Intent, PlanEntry } from "./planTypes"

/** The hand-written logic that expands one {@link Intent.type} into a
 *  `PlanEntry[]` (a mix of commands and further intents), registered with the
 *  {@link import("./PlanExecutor").PlanExecutor} by `type`.
 *
 *  Decomposers are evaluated **lazily, at the cursor** (see
 *  {@link import("./planWalk").advancePlan}), so their guards read *current*
 *  world state — not the world as it was when an earlier, time-extended command
 *  began. An empty result means "nothing to do" (the intent is dropped). */
export interface Decomposer<I extends Intent = Intent> {
    readonly type: string

    /** Expand against current world state. Must make measurable progress toward
     *  its guard so transitive re-emission of its own type can't loop forever
     *  (the walk also enforces a hard depth cap as a backstop). */
    decompose(intent: I): PlanEntry[]
}
