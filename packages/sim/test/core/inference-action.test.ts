import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CharacterInferenceAction,
  arg,
  decodeArgs,
  encodeArgs,
  optional,
  type ActionContent,
  type InferredArgs,
} from '../../src/core/action-inference/CharacterInferenceAction'
import { InferenceActionManager } from '../../src/core/action-inference/InferenceActionManager'
import { EventSystem } from '../../src/game/EventSystem'

/** Builds a manager wired to a real (listener-less) event bus, so the
 *  call-through `syncAction` path can emit without throwing. */
function newManager(): InferenceActionManager {
  return new InferenceActionManager(new EventSystem())
}

// A concrete schema reused across the suite: one required string, one optional
// integer. `typeof` recovers the shape so the subtype needn't restate it.
const followArgs = {
  destination: arg.string({ description: 'static dest desc' }),
  speed: optional(arg.integer()),
}
type FollowArgs = typeof followArgs

/** Test subtype. Its prose depends on mutable `target` state, exercising the
 *  two-phase lifecycle: `target` is set after `super()`, so content is only
 *  valid once `init()`/`refresh()` runs — never during construction. */
class FollowAction extends CharacterInferenceAction<FollowArgs> {
  readonly args = followArgs

  /** State the description derives from; only safe to read post-construction. */
  target = 'the door'
  /** Records what `handle` received, so dispatch can be asserted. */
  received: InferredArgs<FollowArgs> | undefined

  constructor(manager: InferenceActionManager, characterId = 'npc-1') {
    super({ name: 'follow', characterId, layer: 'act', before: false }, manager)
  }

  protected computeContent(): ActionContent<FollowArgs> {
    return {
      description: `follow ${this.target}`,
      shortDescription: 'follow',
      argDescriptions: { destination: `where to go (current: ${this.target})` },
    }
  }

  handle(args: InferredArgs<FollowArgs>): void {
    this.received = args
  }

  /** Mutate state and re-sync, the way a real action would on a world event. */
  moveTo(target: string): void {
    this.target = target
    this.refresh()
  }
}

describe('argument codec', () => {
  describe('decodeArgs', () => {
    it('decodes present args into their typed values', () => {
      const out = decodeArgs(followArgs, [
        { name: 'destination', value: 'castle' },
        { name: 'speed', value: '3' },
      ])
      expect(out).toEqual({ destination: 'castle', speed: 3 })
    })

    it('decodes a missing optional arg to undefined', () => {
      const out = decodeArgs(followArgs, [{ name: 'destination', value: 'castle' }])
      expect(out).toEqual({ destination: 'castle', speed: undefined })
    })

    it('throws when a required arg is absent', () => {
      expect(() => decodeArgs(followArgs, [{ name: 'speed', value: '3' }])).toThrow(/destination/)
    })

    it('throws when a required numeric arg cannot be parsed', () => {
      const schema = { count: arg.integer() }
      expect(() => decodeArgs(schema, [{ name: 'count', value: 'abc' }])).toThrow(/count/)
    })

    it('decodes each Voxta scalar type', () => {
      const schema = {
        s: arg.string(),
        i: arg.integer(),
        d: arg.double(),
        b: arg.boolean(),
      }
      const out = decodeArgs(schema, [
        { name: 's', value: 'hi' },
        { name: 'i', value: '42' },
        { name: 'd', value: '3.5' },
        { name: 'b', value: 'true' },
      ])
      expect(out).toEqual({ s: 'hi', i: 42, d: 3.5, b: true })
    })

    it('decodes boolean as true only for the literal "true"', () => {
      const schema = { b: arg.boolean() }
      expect(decodeArgs(schema, [{ name: 'b', value: 'false' }]).b).toBe(false)
      expect(decodeArgs(schema, [{ name: 'b', value: 'TRUE' }]).b).toBe(false)
    })
  })

  describe('encodeArgs', () => {
    it('maps a schema to the InferenceArgument DTO list with static descriptions', () => {
      expect(encodeArgs(followArgs)).toEqual([
        { name: 'destination', type: 'String', description: 'static dest desc', required: true },
        { name: 'speed', type: 'Integer', description: undefined, required: false },
      ])
    })

    it('lets a dynamic description override the static one', () => {
      const encoded = encodeArgs(followArgs, { destination: 'pick a place' })
      expect(encoded[0].description).toBe('pick a place')
      // Unspecified args keep their static description.
      expect(encoded[1].description).toBeUndefined()
    })
  })
})

describe('CharacterInferenceAction', () => {
  let manager: InferenceActionManager
  let syncSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    manager = newManager()
    syncSpy = vi.spyOn(manager, 'syncAction')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('self-registers on construction without computing prose', () => {
    const action = new FollowAction(manager)
    // Content is still the empty default — computeContent has not run yet.
    expect(action.getDescription()).toBe('')
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it('computes content and re-syncs once on init()', () => {
    const action = new FollowAction(manager)
    action.init()
    expect(action.getDescription()).toBe('follow the door')
    expect(action.getShortDescription()).toBe('follow')
    expect(syncSpy).toHaveBeenCalledTimes(1)
  })

  it('re-syncs only when computed content actually changes', () => {
    const action = new FollowAction(manager)
    action.init()
    expect(syncSpy).toHaveBeenCalledTimes(1)

    action.moveTo('the gate')
    expect(action.getDescription()).toBe('follow the gate')
    expect(syncSpy).toHaveBeenCalledTimes(2)

    // Same state → identical content → no redundant sync.
    action.moveTo('the gate')
    expect(syncSpy).toHaveBeenCalledTimes(2)
  })

  it('merges dynamic argument descriptions over the static ones', () => {
    const action = new FollowAction(manager)
    action.init()
    const args = action.resolveArguments()
    expect(args).toEqual([
      { name: 'destination', type: 'String', description: 'where to go (current: the door)', required: true },
      { name: 'speed', type: 'Integer', description: undefined, required: false },
    ])
  })
})

describe('InferenceActionManager', () => {
  let manager: InferenceActionManager
  let action: FollowAction

  beforeEach(() => {
    manager = newManager()
    vi.spyOn(manager, 'syncAction').mockImplementation(() => { })
    action = new FollowAction(manager)
    action.init()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('decodes an invocation and dispatches typed args to handle()', async () => {
    await manager.onInvocation({
      value: 'follow',
      arguments: [
        { name: 'destination', value: 'castle' },
        { name: 'speed', value: '7' },
      ],
    })
    expect(action.received).toEqual({ destination: 'castle', speed: 7 })
  })

  it('ignores an invocation with no registered handler', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => { })
    await manager.onInvocation({ value: 'unknown' })
    expect(action.received).toBeUndefined()
    expect(log).toHaveBeenCalled()
  })

  it('does not dispatch when decoding fails (missing required arg)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => { })
    await manager.onInvocation({ value: 'follow', arguments: [{ name: 'speed', value: '1' }] })
    expect(action.received).toBeUndefined()
    expect(log).toHaveBeenCalled()
  })

  it('builds the outbound InferenceAction DTO from current content', () => {
    expect(manager.toInferenceAction(action)).toEqual({
      characterId: 'npc-1',
      name: 'follow',
      description: 'follow the door',
      shortDescription: 'follow',
      layer: 'act',
      disabled: false,
      before: false,
      arguments: [
        { name: 'destination', type: 'String', description: 'where to go (current: the door)', required: true },
        { name: 'speed', type: 'Integer', description: undefined, required: false },
      ],
    })
  })
})
