import { singleton } from "tsyringe";
import type { TouchOptions } from "@gen-adventure/shared";

@singleton()
export class TouchService {
    /** Touch options per character, pulled from the sim on first request and
     *  cached — they don't change during a run. Cleared when a new run starts. */
    private readonly options = new Map<string, TouchOptions>()

    constructor() { }

    /** Returns the cached options for a character, pulling them from the sim via
     *  `fetch` on a cache miss. */
    async getOptions(characterId: string, fetch: () => Promise<TouchOptions>): Promise<TouchOptions> {
        const cached = this.options.get(characterId)
        if (cached) return cached

        const options = await fetch()
        this.options.set(characterId, options)
        return options
    }

    /** Drops all cached options (call when a new sim run starts — bodies, and thus
     *  available touches, can differ). */
    clear(): void {
        this.options.clear()
    }
}
