import type { Command, CommandStatus, Validation } from "./planTypes"

/** The hand-written behavior for one {@link Command.type}, registered with the
 *  {@link import("./PlanExecutor").PlanExecutor} by `type`. The command stays a
 *  plain data record; the system is where validation and execution live (the same
 *  data/behavior split decomposers and the rest of the sim use).
 *
 *  `validate` and `execute` are kept as separate steps so "fails before any side
 *  effect" is structural, not a matter of discipline: a failed precondition
 *  produces `failed` with no mutation. */
export interface CommandSystem<C extends Command = Command> {
    readonly type: string

    /** Pure, read-only precondition check gating the transition from "cursor
     *  reaches command" to "command runs". Reads domain systems only; stores
     *  nothing. */
    validate(cmd: C): Validation

    /** Runs / starts the command. May return `completed` (instant), `running`
     *  (time-extended; continued later), or a terminal error status. */
    execute(cmd: C): CommandStatus

    /** Optional invariant re-check for a command that stays `running` across
     *  ticks ("am I still valid?"). A command type opts in only if it can be
     *  invalidated mid-flight. Unused while every command is instant. */
    stillValid?(cmd: C): Validation

    /** Optional continuation tick for a time-extended command (continued by a
     *  ScheduledEvent). Unused while every command is instant. */
    continue?(cmd: C): CommandStatus
}
