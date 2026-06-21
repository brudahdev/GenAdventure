import type { LocationManager } from "../location/LocationManager"
import type { Location } from "../location/Location"
import type { SubLocation } from "../location/SubLocation"

/** BFS over the {@link Location} graph (edges = `LocationLink`s) producing the
 *  ordered steps to feed to `CharacterLocomotion.gotoNearbyLocation`:
 *
 *    `[...connectedLocationIds, targetSubLocationId]`
 *
 *  Each connected-location id is a single LocationLink hop (resolved at run time
 *  by `getLocationLinkByToId`); the trailing sub-location id is resolved by
 *  `getSubLocationById` once the actor is inside the target location.
 *
 *  - already in `toSub`            → `[]`
 *  - same location, different sub  → `[toSub.id]`
 *  - no path between locations     → `[]` (the caller's command precondition then
 *                                    fails cleanly rather than walking nowhere)
 *
 *  Pure: reads the location graph, mutates nothing. Called at decompose time so it
 *  always plans against fresh state and a fresh path. */
export function calcPath(
    locationManager: LocationManager,
    fromSub: SubLocation,
    toSub: SubLocation,
): string[] {
    if (fromSub === toSub) return []

    const fromLoc = fromSub.getParent()
    const toLoc = toSub.getParent()
    if (fromLoc === toLoc) return [toSub.id]

    // BFS over locations; cameFrom doubles as the visited set.
    const cameFrom = new Map<string, string | null>()
    cameFrom.set(fromLoc.id, null)
    const queue: Location[] = [fromLoc]
    let found = false

    while (queue.length > 0) {
        const loc = queue.shift()!
        if (loc.id === toLoc.id) {
            found = true
            break
        }
        for (const link of loc.getLocationLinks().values()) {
            const next = link.getTo()
            if (cameFrom.has(next.id)) continue
            cameFrom.set(next.id, loc.id)
            queue.push(next)
        }
    }

    if (!found) return []

    // Reconstruct the hop ids from fromLoc (exclusive) to toLoc (inclusive).
    const hops: string[] = []
    let cur: string | null = toLoc.id
    while (cur !== null && cur !== fromLoc.id) {
        hops.push(cur)
        cur = cameFrom.get(cur) ?? null
    }
    hops.reverse()

    return [...hops, toSub.id]
}
