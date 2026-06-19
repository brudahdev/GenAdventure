import { singleton } from "tsyringe";
import type { NearbyLocationSummary } from "@gen-adventure/shared";

@singleton()
export class LocationService {
    /** Latest nearby-location options per character, pushed from the sim.
     *  Read on demand when the renderer opens a character's "Move" menu. */
    private readonly options = new Map<string, NearbyLocationSummary>()

    constructor() { }

    onLocationOptions(characterId: string, options: NearbyLocationSummary): void {
        this.options.set(characterId, options)
    }

    getOptions(characterId: string): NearbyLocationSummary {
        return this.options.get(characterId) ?? { subLocations: [], locations: [] }
    }
}
