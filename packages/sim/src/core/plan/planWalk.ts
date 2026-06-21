import type { CommandSystem } from "./CommandSystem"
import type { Decomposer } from "./Decomposer"
import type { PlanEntry, PlanStatus } from "./planTypes"

/** The mutable plan state the walk reads and advances: a `PlanEntry[]` plus a
 *  cursor. {@link import("./ActorPlan").ActorPlan} satisfies this. `getEntries`
 *  returns the *live* array — the walk splices it in place. */
export interface PlanCursor {
    getEntries(): PlanEntry[]
    getCursor(): number
    setCursor(n: number): void
    /** Drop all entries and reset the cursor to 0 (back to idle). */
    reset(): void
}

/** Hard backstop against a decomposer that re-emits its own type without reducing
 *  state. Decomposers are also expected to make measurable progress per the
 *  {@link Decomposer} contract; this just bounds a buggy one. */
const MAX_EXPANSIONS = 256

/** Walks the plan from its cursor as far as it can go *right now*, in place:
 *
 *  - At an **intent**: decompose it against current world state and splice the
 *    result over the intent at the cursor, without advancing — so the result is
 *    re-read (it may itself start with an intent, or be empty). Recursive
 *    expansion falls out naturally.
 *  - At a **command**: `validate` (pure) then `execute`. Only `completed`
 *    advances the cursor; `running` holds position (the plan persists, to be
 *    continued by a ScheduledEvent later); either terminal status stops the walk.
 *
 *  Returns the derived {@link PlanStatus}. On completion or a terminal stop the
 *  plan is `reset()` (there is no replanner above today, so a stopped plan is
 *  cleared after being logged); a `running` plan is left intact for persistence. */
export function advancePlan(
    plan: PlanCursor,
    commands: ReadonlyMap<string, CommandSystem>,
    decomposers: ReadonlyMap<string, Decomposer>,
): PlanStatus {
    const entries = plan.getEntries()
    if (entries.length === 0) return { state: 'idle' }

    let expansions = 0

    for (; ;) {
        const cursor = plan.getCursor()
        if (cursor >= entries.length) {
            plan.reset()
            return { state: 'completed' }
        }

        const entry = entries[cursor]

        if (entry.kind === 'intent') {
            if (++expansions > MAX_EXPANSIONS) {
                const reason = `plan exceeded ${MAX_EXPANSIONS} expansions (non-reducing decomposition of "${entry.type}"?)`
                console.error(`[plan] ${reason}`)
                plan.reset()
                return { state: 'failed', reason }
            }

            const decomposer = decomposers.get(entry.type)
            if (!decomposer) {
                const reason = `no decomposer registered for intent "${entry.type}"`
                console.error(`[plan] ${reason}`)
                plan.reset()
                return { state: 'failed', reason }
            }

            // Replace the intent with its expansion in place; do NOT advance —
            // re-read this position (expansion may begin with another intent, or
            // be empty so the following entry slides under the cursor).
            const expansion = decomposer.decompose(entry)
            entries.splice(cursor, 1, ...expansion)
            continue
        }

        // entry.kind === 'command'
        const system = commands.get(entry.type)
        if (!system) {
            const reason = `no command system registered for command "${entry.type}"`
            console.error(`[plan] ${reason}`)
            plan.reset()
            return { state: 'failed', reason }
        }

        if (entry.status.state === 'pending') {
            // Validation gates start: a pure read, so a failure stops with no
            // side effect.
            const v = system.validate(entry)
            if (!v.ok) {
                entry.status = { state: 'failed', reason: v.reason }
                console.warn(`[plan] command "${entry.type}" failed validation: ${v.reason}`)
                plan.reset()
                return { state: 'failed', reason: v.reason }
            }
            entry.status = system.execute(entry)
        } else if (entry.status.state === 'running') {
            // Continuation path (time-extended commands). Not reached while every
            // command is instant, but kept so a resumed/scheduled tick re-checks
            // the invariant before continuing.
            const v = system.stillValid?.(entry) ?? { ok: true as const }
            if (!v.ok) {
                entry.status = { state: 'failed', reason: v.reason }
                console.warn(`[plan] command "${entry.type}" invariant broke: ${v.reason}`)
                plan.reset()
                return { state: 'failed', reason: v.reason }
            }
            entry.status = system.continue?.(entry) ?? { state: 'completed' }
        }

        switch (entry.status.state) {
            case 'completed':
                plan.setCursor(cursor + 1)
                continue
            case 'running':
                // Hold position; the plan (entries + cursor + this command's
                // progress) persists until its continuation completes it.
                return { state: 'running' }
            case 'failed':
                console.warn(`[plan] stopped: command "${entry.type}" failed: ${entry.status.reason}`)
                plan.reset()
                return { state: 'failed', reason: entry.status.reason }
            case 'interrupted':
                console.warn(`[plan] stopped: command "${entry.type}" interrupted: ${entry.status.cause}`)
                plan.reset()
                return { state: 'interrupted', cause: entry.status.cause }
            case 'pending': {
                // execute() must not leave a command pending — treat as a bug and
                // fail safe rather than spin.
                const reason = `command "${entry.type}" remained pending after execute`
                console.error(`[plan] ${reason}`)
                plan.reset()
                return { state: 'failed', reason }
            }
        }
    }
}
