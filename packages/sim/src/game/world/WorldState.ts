import { inject, Lifecycle, scoped } from "tsyringe";
import type { WorldSaveable } from "../../core/save/Saveable";
import { RESTORE_SOURCE, RestoreSource } from "../../core/save/RestoreSource";

/** {@link WorldState}'s save blob: the run's RNG seed and an open-ended map of
 *  global flags (quest/story progression, one-off world changes, …). */
interface WorldSave {
    rngSeed: number
    flags: Record<string, unknown>
}

/** The home for global, non-entity run state. Today it carries the RNG seed
 *  (so a resumed run is reproducible once the sim has randomness) and a generic
 *  flag map; richer systems (quests, world mutations) hang their global state
 *  here rather than inventing a new top-level save section each time. Unbounded
 *  ledger data (events/per-entity knowledge) does NOT belong here — that wants a
 *  separate, queryable store. */
@scoped(Lifecycle.ContainerScoped)
export class WorldState implements WorldSaveable<WorldSave> {
    readonly saveKey = 'world'

    private readonly rngSeed: number
    private readonly flags: Record<string, unknown>

    constructor(@inject(RESTORE_SOURCE) restore: RestoreSource) {
        const saved = restore.forWorld<WorldSave>(this.saveKey, () => ({
            rngSeed: Math.floor(Math.random() * 0x7fffffff),
            flags: {},
        }))
        this.rngSeed = saved.rngSeed
        this.flags = { ...saved.flags }
    }

    getRngSeed(): number { return this.rngSeed }

    getFlag<T = unknown>(key: string): T | undefined { return this.flags[key] as T | undefined }

    setFlag(key: string, value: unknown): void { this.flags[key] = value }

    save(): WorldSave {
        return { rngSeed: this.rngSeed, flags: { ...this.flags } }
    }
}
