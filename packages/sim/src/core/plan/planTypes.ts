/** The data vocabulary of the intent/command layer. Everything here is plain,
 *  JSON-serializable data — no behavior, no class instances — so a live plan
 *  (a `PlanEntry[]` + cursor + per-command `status`) serializes verbatim as the
 *  save format. All logic lives in registered *systems* (one {@link Decomposer}
 *  per intent type, one {@link CommandSystem} per command type), keyed by `type`.
 *  See `docs/intent.txt`. */

/** A high-level goal that a {@link Decomposer} expands into a `PlanEntry[]`.
 *  Concrete intents extend this with their own fields (see `game/plan/planDefs`). */
export interface Intent {
    readonly kind: 'intent'
    readonly type: string
}

/** A single primitive run against the engine by a {@link CommandSystem}. Carries
 *  its own mutable {@link CommandStatus} (and, for time-extended commands, its own
 *  progress fields) so it is the source of truth for its progress across saves. */
export interface Command {
    readonly kind: 'command'
    readonly type: string
    status: CommandStatus
}

/** A node in a (partially expanded) plan: either a not-yet-expanded intent or a
 *  runnable command. The mixed list is the plan, the expansion frontier, and the
 *  persisted state all at once. */
export type PlanEntry = Intent | Command

/** A command's outcome, as a tagged value (not control flow). `running` is the
 *  one the instant-execution model didn't need: a time-extended command holds it
 *  while continued by a ScheduledEvent. `failed` = the command's own attempt
 *  couldn't achieve its effect (precondition false, no path, target gone);
 *  `interrupted` = something external cut it short. They are kept distinct so the
 *  layer above can route them differently later, even though both stop the walk
 *  today. */
export type CommandStatus =
    | { state: 'pending' }
    | { state: 'running' }
    | { state: 'completed' }
    | { state: 'failed'; reason: string }
    | { state: 'interrupted'; cause: string }

/** The plan executor's view, derived from command statuses + cursor position.
 *  `idle` = no work outstanding; the layer above reads this, not individual
 *  command statuses. */
export type PlanStatus =
    | { state: 'idle' }
    | { state: 'running' }
    | { state: 'completed' }
    | { state: 'failed'; reason: string }
    | { state: 'interrupted'; cause: string }

/** Result of a pure, read-only command precondition / invariant check. */
export type Validation =
    | { ok: true }
    | { ok: false; reason: string }

export const ok = (): Validation => ({ ok: true })
export const invalid = (reason: string): Validation => ({ ok: false, reason })

export const pending = (): CommandStatus => ({ state: 'pending' })
export const running = (): CommandStatus => ({ state: 'running' })
export const completed = (): CommandStatus => ({ state: 'completed' })
export const failed = (reason: string): CommandStatus => ({ state: 'failed', reason })
export const interrupted = (cause: string): CommandStatus => ({ state: 'interrupted', cause })
