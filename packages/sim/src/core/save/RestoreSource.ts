import type { SaveDocument } from "@gen-adventure/shared"

export const RESTORE_SOURCE = 'RestoreSource'

/** The single run-scoped seam through which components and systems obtain their
 *  initial state: the saved blob if this run is a resume, otherwise the value a
 *  `computeDefault` closure builds from scenario config. Replaces the former
 *  per-aspect `SavedXAdapter` classes with one keyed overlay — so components
 *  construct *directly* into their final state (no build-then-overwrite) and a
 *  new stateful aspect needs no new adapter, just a `save()` + a default closure.
 *
 *  A `null` snapshot means a fresh start (every lookup takes its default). */
export class RestoreSource {
  constructor(private readonly snapshot: SaveDocument | null) { }

  /** True when this run is restoring a save (vs. a fresh start). */
  get isResume(): boolean {
    return this.snapshot !== null
  }

  /** Saved blob for `entityId`'s component `keyId`, else the default. The keys
   *  match `ComponentKey.id`, so an entity's snapshot and its components align. */
  forEntity<T>(entityId: string, keyId: string, computeDefault: () => T): T {
    const saved = this.snapshot?.entities
      .find(entity => entity.id === entityId)
      ?.components[keyId]
    return saved !== undefined ? (saved as T) : computeDefault()
  }

  /** Saved world blob for `keyId` (e.g. `time`), else the default. */
  forWorld<T>(keyId: string, computeDefault: () => T): T {
    const saved = this.snapshot?.world[keyId]
    return saved !== undefined ? (saved as T) : computeDefault()
  }
}
