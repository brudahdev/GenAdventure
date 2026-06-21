import { describe, expect, it } from 'vitest'
import { advancePlan, type PlanCursor } from '../../src/core/plan/planWalk'
import type { CommandSystem } from '../../src/core/plan/CommandSystem'
import type { Decomposer } from '../../src/core/plan/Decomposer'
import type {
  Command,
  CommandStatus,
  Intent,
  PlanEntry,
  Validation,
} from '../../src/core/plan/planTypes'

/** A minimal in-memory plan the walk can read and splice. */
class FakePlan implements PlanCursor {
  constructor(public entries: PlanEntry[], public cursor = 0) {}
  getEntries(): PlanEntry[] { return this.entries }
  getCursor(): number { return this.cursor }
  setCursor(n: number): void { this.cursor = n }
  reset(): void { this.entries.length = 0; this.cursor = 0 }
}

const intent = (type: string, extra: Record<string, unknown> = {}): Intent =>
  ({ kind: 'intent', type, ...extra }) as Intent
const command = (type: string, extra: Record<string, unknown> = {}): Command =>
  ({ kind: 'command', type, status: { state: 'pending' }, ...extra }) as Command

/** A command system that records execution order into `order`. */
function recordingCommand(
  type: string,
  order: string[],
  opts: { result?: CommandStatus; validation?: Validation } = {},
): CommandSystem {
  return {
    type,
    validate: () => opts.validation ?? { ok: true },
    execute: (cmd) => { order.push(cmd.type); return opts.result ?? { state: 'completed' } },
  }
}

function decomposer(type: string, expand: () => PlanEntry[]): Decomposer {
  return { type, decompose: expand }
}

function maps(systems: CommandSystem[], decs: Decomposer[]) {
  return {
    commands: new Map(systems.map((s) => [s.type, s])),
    decomposers: new Map(decs.map((d) => [d.type, d])),
  }
}

describe('advancePlan', () => {
  it('returns idle for an empty plan', () => {
    const plan = new FakePlan([])
    const { commands, decomposers } = maps([], [])
    expect(advancePlan(plan, commands, decomposers)).toEqual({ state: 'idle' })
  })

  it('runs a single command to completion and clears the plan', () => {
    const order: string[] = []
    const plan = new FakePlan([command('a')])
    const { commands, decomposers } = maps([recordingCommand('a', order)], [])

    expect(advancePlan(plan, commands, decomposers)).toEqual({ state: 'completed' })
    expect(order).toEqual(['a'])
    expect(plan.entries).toEqual([]) // reset on completion
    expect(plan.cursor).toBe(0)
  })

  it('advances the cursor across multiple commands in order', () => {
    const order: string[] = []
    const plan = new FakePlan([command('a'), command('b'), command('c')])
    const { commands, decomposers } = maps(
      [recordingCommand('a', order), recordingCommand('b', order), recordingCommand('c', order)],
      [],
    )

    expect(advancePlan(plan, commands, decomposers)).toEqual({ state: 'completed' })
    expect(order).toEqual(['a', 'b', 'c'])
  })

  it('expands an intent at the cursor then runs the result', () => {
    const order: string[] = []
    const plan = new FakePlan([intent('i')])
    const { commands, decomposers } = maps(
      [recordingCommand('a', order)],
      [decomposer('i', () => [command('a')])],
    )

    expect(advancePlan(plan, commands, decomposers)).toEqual({ state: 'completed' })
    expect(order).toEqual(['a'])
  })

  it('expands recursively (intent -> intent -> command)', () => {
    const order: string[] = []
    const plan = new FakePlan([intent('i1')])
    const { commands, decomposers } = maps(
      [recordingCommand('a', order)],
      [
        decomposer('i1', () => [intent('i2')]),
        decomposer('i2', () => [command('a')]),
      ],
    )

    expect(advancePlan(plan, commands, decomposers)).toEqual({ state: 'completed' })
    expect(order).toEqual(['a'])
  })

  it('splices an expansion in place, preserving surrounding order', () => {
    const order: string[] = []
    const plan = new FakePlan([command('a'), intent('i'), command('c')])
    const { commands, decomposers } = maps(
      [recordingCommand('a', order), recordingCommand('b', order), recordingCommand('c', order)],
      [decomposer('i', () => [command('b')])],
    )

    expect(advancePlan(plan, commands, decomposers)).toEqual({ state: 'completed' })
    expect(order).toEqual(['a', 'b', 'c'])
  })

  it('drops an intent whose decomposition is empty', () => {
    const order: string[] = []
    const plan = new FakePlan([intent('i'), command('a')])
    const { commands, decomposers } = maps(
      [recordingCommand('a', order)],
      [decomposer('i', () => [])],
    )

    expect(advancePlan(plan, commands, decomposers)).toEqual({ state: 'completed' })
    expect(order).toEqual(['a'])
  })

  it('stops on a failed precondition with no side effect', () => {
    const order: string[] = []
    const plan = new FakePlan([command('a'), command('b')])
    const { commands, decomposers } = maps(
      [
        recordingCommand('a', order, { validation: { ok: false, reason: 'nope' } }),
        recordingCommand('b', order),
      ],
      [],
    )

    expect(advancePlan(plan, commands, decomposers)).toEqual({ state: 'failed', reason: 'nope' })
    expect(order).toEqual([]) // 'a' never executed (validate-then-execute), 'b' never reached
  })

  it('stops when a command execute returns failed', () => {
    const order: string[] = []
    const plan = new FakePlan([command('a'), command('b')])
    const { commands, decomposers } = maps(
      [
        recordingCommand('a', order, { result: { state: 'failed', reason: 'boom' } }),
        recordingCommand('b', order),
      ],
      [],
    )

    expect(advancePlan(plan, commands, decomposers)).toEqual({ state: 'failed', reason: 'boom' })
    expect(order).toEqual(['a'])
  })

  it('holds position and preserves the plan when a command is running', () => {
    const order: string[] = []
    const plan = new FakePlan([command('a'), command('b')])
    const { commands, decomposers } = maps(
      [
        recordingCommand('a', order, { result: { state: 'running' } }),
        recordingCommand('b', order),
      ],
      [],
    )

    expect(advancePlan(plan, commands, decomposers)).toEqual({ state: 'running' })
    expect(order).toEqual(['a'])
    expect(plan.entries).toHaveLength(2) // NOT reset — persists for continuation
    expect(plan.cursor).toBe(0)
  })

  it('fails (depth cap) on non-reducing recursion', () => {
    const plan = new FakePlan([intent('loop')])
    const { commands, decomposers } = maps([], [decomposer('loop', () => [intent('loop')])])

    const status = advancePlan(plan, commands, decomposers)
    expect(status.state).toBe('failed')
    expect(status.state === 'failed' && status.reason).toMatch(/expansions/)
  })

  it('fails on an unknown intent type', () => {
    const plan = new FakePlan([intent('unknown')])
    const { commands, decomposers } = maps([], [])
    const status = advancePlan(plan, commands, decomposers)
    expect(status.state).toBe('failed')
    expect(status.state === 'failed' && status.reason).toMatch(/no decomposer/)
  })

  it('fails on an unknown command type', () => {
    const plan = new FakePlan([command('unknown')])
    const { commands, decomposers } = maps([], [])
    const status = advancePlan(plan, commands, decomposers)
    expect(status.state).toBe('failed')
    expect(status.state === 'failed' && status.reason).toMatch(/no command system/)
  })
})
