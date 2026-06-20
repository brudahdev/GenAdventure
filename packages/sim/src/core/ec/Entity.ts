import type { EntitySnapshot } from "@gen-adventure/shared"
import type { Component } from "./Component"
import type { ComponentKey } from "./ComponentKey"
import { isSaveable } from "../save/Saveable"

/** A composable game object: an id plus a bag of components keyed by
 *  {@link ComponentKey}. Replaces the old `Character` base class — siblings
 *  reach each other via `require(key)` instead of fixed fields, so adding an
 *  aspect (inventory, stats, needs) touches zero existing entity code. Component
 *  insertion order is preserved so `init()`/`dispose()` run in a stable order. */
export class Entity {
    private readonly components = new Map<string, object>()

    constructor(readonly id: string) { }

    add<T extends object>(key: ComponentKey<T>, component: T): this {
        this.components.set(key.id, component)
        return this
    }

    get<T extends object>(key: ComponentKey<T>): T | undefined {
        return this.components.get(key.id) as T | undefined
    }

    /** Like {@link get} but throws when the component is absent — for the
     *  "this entity must have it" sibling accesses. */
    require<T extends object>(key: ComponentKey<T>): T {
        const component = this.components.get(key.id)
        if (!component) {
            throw new Error(`entity ${this.id} is missing component ${key.id}`)
        }
        return component as T
    }

    has<T extends object>(key: ComponentKey<T>): boolean {
        return this.components.has(key.id)
    }

    /** Second boot phase: emits each component's initial events, in insertion
     *  order, once the whole run graph is constructed. */
    init(): void {
        for (const component of this.components.values()) {
            (component as Component).init?.()
        }
    }

    lateinit(): void {
        for (const component of this.components.values()) {
            (component as Component).lateInit?.()
        }
    }

    /** Collects a snapshot of every component that implements the `Saveable`
     *  capability, keyed by its `ComponentKey.id`. Pure-config components
     *  contribute nothing and are recomputed from config on the next load. */
    save(): EntitySnapshot {
        const components: Record<string, unknown> = {}
        for (const [keyId, component] of this.components) {
            if (isSaveable(component)) {
                components[keyId] = component.save()
            }
        }
        return { id: this.id, components }
    }

    /** Tears the entity's components down in reverse insertion order. */
    dispose(): void {
        const components = [...this.components.values()]
        for (let i = components.length - 1; i >= 0; i--) {
            (components[i] as Component).dispose?.()
        }
    }
}
