import { singleton } from "tsyringe";
import type { TouchOptions } from "@gen-adventure/shared";

@singleton()
export class TouchService {
    /** Latest available touch options per character, pushed from the sim.
     *  Read on demand when the renderer opens a character's "Touch" menu. */
    private readonly options = new Map<string, TouchOptions>()

    constructor() { }

    onTouchOptions(characterId: string, options: TouchOptions): void {
        this.options.set(characterId, options)
    }

    getOptions(characterId: string): TouchOptions {
        return this.options.get(characterId) ?? { targets: [] }
    }
}
