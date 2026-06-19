/** Optional persistence capability, parallel to the `Component` lifecycle hooks.
 *  A component that holds runtime state implements `save()` returning a plain,
 *  JSON-serializable blob; the matching *restore* half is its factory's default
 *  closure (see {@link RestoreSource}), so the codec for one aspect lives in one
 *  file. Pure-config components implement nothing and are recomputed on load. */
export interface Saveable<T = unknown> {
  save(): T
}

export function isSaveable(value: object): value is Saveable {
  return typeof (value as Saveable).save === 'function'
}

/** A run system (not entity component) that contributes a slice of `world`
 *  state to the save, keyed by `saveKey` (e.g. `time`, `world`). */
export interface WorldSaveable<T = unknown> {
  readonly saveKey: string
  save(): T
}
