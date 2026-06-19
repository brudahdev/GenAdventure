import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION, type SaveDocument } from '@gen-adventure/shared'
import { RestoreSource } from '../../src/core/save/RestoreSource'
import { EventSystem } from '../../src/game/EventSystem'
import { MinHeap } from '../../src/core/time/MinHeap'
import { Scheduler } from '../../src/core/time/Scheduler'
import type { ScheduledEvent, ScheduledEventHandler } from '../../src/core/time/ScheduledEvent'

/** A test event carrying a label so handlers can record what fired, in order. */
interface LabelEvent extends ScheduledEvent {
  type: 'label'
  label: string
}

/** Collects the labels of every event it handles, in firing order. */
class RecordingHandler implements ScheduledEventHandler<LabelEvent> {
  readonly fired: string[] = []
  handle(event: LabelEvent): void {
    this.fired.push(event.label)
  }
}

/** Builds a `SaveDocument` whose only meaningful slice is `world.scheduler`. */
function docWithScheduler(blob: unknown): SaveDocument {
  return {
    version: CURRENT_SAVE_VERSION,
    meta: { chatId: 'c', slot: 0, savedAt: 0, gameTimeMs: 0 },
    world: { scheduler: blob },
    entities: [],
  }
}

/** Constructs a fresh-start scheduler wired to a new event bus. */
function freshScheduler(): { scheduler: Scheduler; events: EventSystem } {
  const events = new EventSystem()
  return { scheduler: new Scheduler(new RestoreSource(null), events), events }
}

/** Advances game time to `gameTimeMs`, which drives the scheduler's drain. */
function tick(events: EventSystem, gameTimeMs: number): void {
  events.emit('time.tick', { deltaMs: 0, gameTimeMs })
}

describe('MinHeap', () => {
  it('pops elements in ascending comparator order', () => {
    const heap = new MinHeap<number>((a, b) => a - b)
    const input = [5, 1, 9, 3, 3, 7, 0, 2, 8, 4, 6]
    for (const n of input) heap.push(n)

    const out: number[] = []
    while (heap.size > 0) out.push(heap.pop()!)

    expect(out).toEqual([...input].sort((a, b) => a - b))
  })

  it('peek returns the min without removing it; empty pop/peek are undefined', () => {
    const heap = new MinHeap<number>((a, b) => a - b)
    expect(heap.peek()).toBeUndefined()
    expect(heap.pop()).toBeUndefined()

    heap.push(4)
    heap.push(2)
    expect(heap.peek()).toBe(2)
    expect(heap.size).toBe(2)
  })
})

describe('Scheduler', () => {
  it('fires due events in time order, FIFO on ties', () => {
    const { scheduler, events } = freshScheduler()
    const handler = new RecordingHandler()
    scheduler.registerHandler<LabelEvent>('label', handler)

    // Scheduled out of order; two share a time to prove FIFO tie-breaking.
    scheduler.schedule({ type: 'label', label: 'c' } as LabelEvent, 300)
    scheduler.schedule({ type: 'label', label: 'a' } as LabelEvent, 100)
    scheduler.schedule({ type: 'label', label: 'b1' } as LabelEvent, 200)
    scheduler.schedule({ type: 'label', label: 'b2' } as LabelEvent, 200)

    tick(events, 1000)

    expect(handler.fired).toEqual(['a', 'b1', 'b2', 'c'])
  })

  it('only drains events that are due, leaving the rest pending', () => {
    const { scheduler, events } = freshScheduler()
    const handler = new RecordingHandler()
    scheduler.registerHandler<LabelEvent>('label', handler)

    scheduler.schedule({ type: 'label', label: 'early' } as LabelEvent, 100)
    scheduler.schedule({ type: 'label', label: 'late' } as LabelEvent, 500)

    tick(events, 100)
    expect(handler.fired).toEqual(['early'])

    tick(events, 499)
    expect(handler.fired).toEqual(['early'])

    tick(events, 500)
    expect(handler.fired).toEqual(['early', 'late'])
  })

  it('throws on a second handler for the same type', () => {
    const { scheduler } = freshScheduler()
    scheduler.registerHandler<LabelEvent>('label', new RecordingHandler())
    expect(() => scheduler.registerHandler<LabelEvent>('label', new RecordingHandler())).toThrow()
  })

  it('does not fire a cancelled event', () => {
    const { scheduler, events } = freshScheduler()
    const handler = new RecordingHandler()
    scheduler.registerHandler<LabelEvent>('label', handler)

    const keep = scheduler.schedule({ type: 'label', label: 'keep' } as LabelEvent, 100)
    const drop = scheduler.schedule({ type: 'label', label: 'drop' } as LabelEvent, 100)
    scheduler.cancel(drop)
    void keep

    tick(events, 1000)

    expect(handler.fired).toEqual(['keep'])
  })

  it('logs and skips an event whose type has no handler, then keeps draining', () => {
    const { scheduler, events } = freshScheduler()
    const handler = new RecordingHandler()
    scheduler.registerHandler<LabelEvent>('label', handler)

    scheduler.schedule({ type: 'orphan' }, 100)
    scheduler.schedule({ type: 'label', label: 'after' } as LabelEvent, 200)

    tick(events, 1000)

    // The orphan is dropped; the handled event after it still fires.
    expect(handler.fired).toEqual(['after'])
  })

  it('keeps draining when a handler throws', () => {
    const { scheduler, events } = freshScheduler()
    let threw = false
    const recorder = new RecordingHandler()
    scheduler.registerHandler<ScheduledEvent>('boom', {
      handle: () => { threw = true; throw new Error('boom') },
    })
    scheduler.registerHandler<LabelEvent>('label', recorder)

    scheduler.schedule({ type: 'boom' }, 100)
    scheduler.schedule({ type: 'label', label: 'survived' } as LabelEvent, 200)

    tick(events, 1000)

    expect(threw).toBe(true)
    expect(recorder.fired).toEqual(['survived'])
  })

  it('persists pending events and restores them on resume (cancelled ones excluded)', () => {
    const before = freshScheduler()
    before.scheduler.registerHandler<LabelEvent>('label', new RecordingHandler())

    before.scheduler.schedule({ type: 'label', label: 'survives' } as LabelEvent, 250)
    const cancelled = before.scheduler.schedule({ type: 'label', label: 'gone' } as LabelEvent, 250)
    before.scheduler.cancel(cancelled)

    const blob = before.scheduler.save()
    // The cancelled entry is filtered out of the save.
    expect(JSON.stringify(blob)).not.toContain('gone')

    // Resume into a brand-new scheduler from the persisted blob.
    const events = new EventSystem()
    const resumed = new Scheduler(new RestoreSource(docWithScheduler(blob)), events)
    const handler = new RecordingHandler()
    resumed.registerHandler<LabelEvent>('label', handler)

    tick(events, 1000)

    expect(handler.fired).toEqual(['survives'])
  })

  it('continues unique ids across a resume so old handles stay valid', () => {
    const before = freshScheduler()
    before.scheduler.registerHandler<LabelEvent>('label', new RecordingHandler())
    before.scheduler.schedule({ type: 'label', label: 'pending' } as LabelEvent, 500)

    const events = new EventSystem()
    const resumed = new Scheduler(new RestoreSource(docWithScheduler(before.scheduler.save())), events)
    const handler = new RecordingHandler()
    resumed.registerHandler<LabelEvent>('label', handler)

    // A newly scheduled event must not collide with the restored one's id.
    const newId = resumed.schedule({ type: 'label', label: 'fresh' } as LabelEvent, 100)
    resumed.cancel(newId)

    tick(events, 1000)

    // Only the restored event fires; cancelling the new id didn't drop it.
    expect(handler.fired).toEqual(['pending'])
  })
})
