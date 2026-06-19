import { inject, Lifecycle, scoped } from "tsyringe";
import type { WorldSaveable } from "../save/Saveable";
import { RESTORE_SOURCE, RestoreSource } from "../save/RestoreSource";
import { EventSystem } from "../../game/EventSystem";
import { Logger } from "../Logger";
import { MinHeap, type Comparator } from "./MinHeap";
import type { ScheduledEvent, ScheduledEventHandler } from "./ScheduledEvent";

/** A handle returned by {@link Scheduler.schedule}, passed back to
 *  {@link Scheduler.cancel} to drop a still-pending event. */
export type ScheduledEventId = number

/** A pending event plus the bookkeeping the heap orders on. Persisted as-is. */
interface ScheduledEntry {
    /** Monotonic id: the cancel handle and the FIFO tie-breaker for equal times. */
    id: ScheduledEventId
    /** Absolute game time (ms) at which the event becomes due. */
    fireAtMs: number
    event: ScheduledEvent
}

/** {@link Scheduler}'s world save blob: the pending heap (live entries only) and
 *  the next id, so handles stay unique across a resume. */
interface SchedulerSave {
    nextId: number
    entries: ScheduledEntry[]
}

/** Earliest `fireAtMs` first; ties broken by ascending `id` so equal-time events
 *  fire in the order they were scheduled (FIFO). */
const byFireTimeThenId: Comparator<ScheduledEntry> = (a, b) =>
    a.fireAtMs - b.fireAtMs || a.id - b.id

/** A persistable timer queue keyed on game time. Callers `schedule` a
 *  {@link ScheduledEvent} to fire at a given `gameTimeMs`; on every `time.tick`
 *  the scheduler drains all entries that have come due and dispatches each to the
 *  single handler registered for its `type`. Pending events ride along in the
 *  world save (see {@link WorldSaveable}) and are restored on resume; handlers are
 *  not persisted — each run re-registers them in its systems' constructors, the
 *  same persist-data / rebuild-behavior split the rest of the sim uses. */
@scoped(Lifecycle.ContainerScoped)
export class Scheduler implements WorldSaveable<SchedulerSave> {
    readonly saveKey = 'scheduler'

    private readonly logger = new Logger("Scheduler")

    /** One handler per event type — O(1) lookup on dispatch. */
    private readonly handlers = new Map<string, ScheduledEventHandler>()

    private readonly heap = new MinHeap<ScheduledEntry>(byFireTimeThenId)

    /** Ids of entries still pending. `cancel` removes from here without touching
     *  the heap (lazy deletion); the drain loop skips heap entries whose id has
     *  left this set. Also bounds what `save` writes — tombstones never persist. */
    private readonly live = new Set<ScheduledEventId>()

    private nextId: ScheduledEventId

    constructor(
        @inject(RESTORE_SOURCE) restore: RestoreSource,
        eventSystem: EventSystem,
    ) {
        const saved = restore.forWorld<SchedulerSave>(
            this.saveKey,
            () => ({ nextId: 0, entries: [] }),
        )
        this.nextId = saved.nextId
        for (const entry of saved.entries) {
            this.heap.push(entry)
            this.live.add(entry.id)
        }

        eventSystem.on("time.tick", ({ gameTimeMs }) => this.drainDue(gameTimeMs))
    }

    /** Bind the sole handler for `type`. Throws if one is already registered, to
     *  surface accidental double-registration rather than silently shadowing. */
    registerHandler<E extends ScheduledEvent>(type: string, handler: ScheduledEventHandler<E>): void {
        if (this.handlers.has(type)) {
            throw new Error(`scheduler already has a handler for "${type}"`)
        }
        this.handlers.set(type, handler as ScheduledEventHandler)
    }

    /** Queue `event` to fire once game time reaches `fireAtMs`. Returns a handle
     *  for {@link cancel}. An event whose time is already past fires on the next
     *  tick. */
    schedule(event: ScheduledEvent, fireAtMs: number): ScheduledEventId {
        const id = this.nextId++
        this.heap.push({ id, fireAtMs, event })
        this.live.add(id)
        return id
    }

    /** Drop a still-pending event by its handle. No-op if it already fired or was
     *  cancelled. */
    cancel(id: ScheduledEventId): void {
        this.live.delete(id)
    }

    save(): SchedulerSave {
        return {
            nextId: this.nextId,
            entries: this.heap.toArray().filter(entry => this.live.has(entry.id)),
        }
    }

    /** Pops and dispatches every entry due at or before `gameTimeMs`, in heap
     *  order. Cancelled entries (no longer live) are discarded; an event with no
     *  registered handler is logged and skipped. Each dispatch is isolated so one
     *  throwing handler doesn't stall the rest of the drain. */
    private drainDue(gameTimeMs: number): void {
        while (this.heap.size > 0 && this.heap.peek()!.fireAtMs <= gameTimeMs) {
            const entry = this.heap.pop()!
            if (!this.live.delete(entry.id)) continue

            const handler = this.handlers.get(entry.event.type)
            if (!handler) {
                this.logger.warn(`no handler registered for "${entry.event.type}", dropping event`)
                continue
            }

            try {
                handler.handle(entry.event)
            } catch (err) {
                this.logger.error(`handler for "${entry.event.type}" threw: ${err}`)
            }
        }
    }
}
