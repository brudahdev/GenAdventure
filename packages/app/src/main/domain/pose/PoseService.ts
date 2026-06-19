import { singleton } from "tsyringe";

@singleton()
export class PoseService {
    /** Latest available pose options per character, pushed from the sim.
     *  Read on demand when the renderer opens a character's "Pose" menu. */
    private readonly options = new Map<string, string[]>()

    constructor() { }

    onPoseOptions(characterId: string, options: string[]): void {
        this.options.set(characterId, options)
    }

    getOptions(characterId: string): string[] {
        return this.options.get(characterId) ?? []
    }
}
