/** Lifecycle contract for a sim run's systems. `SimWorld` keeps its systems in
 *  an explicit ordered list: `init()` runs front-to-back once the whole run
 *  graph is constructed (so initial events reach every subscriber), `dispose()`
 *  runs back-to-front on teardown. To add a system: implement this, inject it
 *  into `SimWorld`, and append it to the list. */
export interface GameSystem {
    init?(): void
    dispose?(): void
}
