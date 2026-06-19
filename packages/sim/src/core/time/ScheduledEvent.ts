/** A persistable unit of deferred work, handed to {@link import("./Scheduler").Scheduler.schedule}
 *  to fire at a given game time. `type` is the discriminator the scheduler uses
 *  for O(1) handler lookup; concrete events add their own JSON-serializable
 *  fields. The whole object is written into the world save verbatim, so it must
 *  stay plain data (no functions, no class instances). */
export interface ScheduledEvent {
    readonly type: string
}

/** The behavior bound to a single {@link ScheduledEvent.type}. Registered with
 *  the scheduler via `registerHandler`; only the matching handler runs when an
 *  event of that type comes due. A handler holds whatever services it needs
 *  (captured when its owner constructs it) and is re-registered every run —
 *  handlers are never persisted, only the events are. */
export interface ScheduledEventHandler<E extends ScheduledEvent = ScheduledEvent> {
    handle(event: E): void
}
