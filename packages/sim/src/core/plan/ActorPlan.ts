import type { Entity } from "../ec/Entity"
import type { Saveable } from "../save/Saveable"
import { RESTORE_SOURCE, RestoreSource } from "../save/RestoreSource"
import { defineKey } from "../ec/ComponentKey"
import { defineFactory } from "../ec/ComponentFactory"
import type { Intent, PlanEntry } from "./planTypes"
import type { PlanCursor } from "./planWalk"

export const ActorPlanKey = defineKey<ActorPlan>("actor.plan")

/** An actor's live plan: the partially-expanded `(Command|Intent)[]` plus a
 *  cursor. {@link ActorPlan}'s save blob is exactly this — the one representation
 *  is plan, expansion frontier, and persisted state at once (see
 *  `docs/intent.txt`). */
interface ActorPlanSave {
    entries: PlanEntry[]
    cursor: number
}

/** The per-entity home of an actor's plan. A dumb, persistable data holder that
 *  the {@link import("./PlanExecutor").PlanExecutor} system operates on via the
 *  {@link PlanCursor} interface — keeping data (this component) and behavior (the
 *  walk) separate, per the design's "data and systems over closures/classes".
 *  No `Component` lifecycle hooks needed — it is stored, saved (via the duck-typed
 *  `Saveable` check), and restored like any other component. */
export class ActorPlan implements Saveable<ActorPlanSave>, PlanCursor {
    /** The live entry list. Mutated in place (spliced) by the walk, so the
     *  instance is kept stable for its lifetime. */
    private readonly entries: PlanEntry[]
    private cursor: number

    constructor(entity: Entity, restore: RestoreSource) {
        const saved = restore.forEntity<ActorPlanSave>(
            entity.id,
            ActorPlanKey.id,
            () => ({ entries: [], cursor: 0 }),
        )
        this.entries = saved.entries
        this.cursor = saved.cursor
    }

    save(): ActorPlanSave {
        return { entries: this.entries, cursor: this.cursor }
    }

    /** Queue a top-level intent at the end of the plan. */
    append(intent: Intent): void {
        this.entries.push(intent)
    }

    /** True when there is no outstanding work. */
    isIdle(): boolean {
        return this.cursor >= this.entries.length
    }

    // --- PlanCursor ---

    getEntries(): PlanEntry[] {
        return this.entries
    }

    getCursor(): number {
        return this.cursor
    }

    setCursor(n: number): void {
        this.cursor = n
    }

    reset(): void {
        this.entries.length = 0
        this.cursor = 0
    }
}

export const actorPlanFactory = defineFactory(ActorPlanKey, (entity, c) =>
    new ActorPlan(
        entity,
        c.resolve<RestoreSource>(RESTORE_SOURCE),
    ))
