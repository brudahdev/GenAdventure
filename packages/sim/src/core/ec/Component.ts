/** A behavior-rich piece of an {@link Entity}. Unlike pure-data ECS components,
 *  EC components keep their methods, internal state and event subscriptions —
 *  the entity is just the bag that holds them and lets siblings find each other.
 *  The two-phase lifecycle mirrors the run's existing convention: constructors
 *  wire state silently, `init()` emits the first events once every subscriber in
 *  the run graph exists, `dispose()` tears down in reverse. */
export interface Component {
    init?(): void
    lateInit?(): void
    dispose?(): void
}
