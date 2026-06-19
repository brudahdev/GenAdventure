/** A typed handle for a component slot on an {@link Entity}. The phantom `_t`
 *  carries the component type so `entity.get(key)` / `require(key)` return the
 *  right type without casts, while the runtime `id` is the actual map key.
 *
 *  The constraint is `object` (not the lifecycle `Component`) on purpose:
 *  `Component` is a weak type — all-optional members — so a data-only component
 *  like `CharacterIdentity` would "have no properties in common" with it. */
export interface ComponentKey<T extends object> {
    readonly id: string
    /** Phantom type carrier — never read at runtime. */
    readonly _t?: T
}

/** Defines a component key. `id` must be unique across the run; it doubles as
 *  the human-readable name used in "missing component" errors. */
export const defineKey = <T extends object>(id: string): ComponentKey<T> => ({ id })
