import { singleton } from "tsyringe";
import type { ClothingStateChangeOptionsSummary } from "@gen-adventure/shared";

@singleton()
export class ClothingService {
    /** Latest clothing state-change options per character, pushed from the sim.
     *  Read on demand when the renderer opens a clothing context menu. */
    private readonly options = new Map<string, ClothingStateChangeOptionsSummary[]>();

    constructor() { }

    onClothingStateOptions(characterId: string, options: ClothingStateChangeOptionsSummary[]): void {
        this.options.set(characterId, options)
    }

    getOptions(characterId: string): ClothingStateChangeOptionsSummary[] {
        return this.options.get(characterId) ?? []
    }
}
