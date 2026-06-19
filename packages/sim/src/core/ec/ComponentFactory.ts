import type { DependencyContainer } from "tsyringe"
import type { Entity } from "./Entity"
import type { ComponentKey } from "./ComponentKey"

/** Builds one component and attaches it to an entity. A blueprint is just an
 *  ordered list of these. Implementations resolve the deps their component needs
 *  from the run's child container — so no fat shared context is threaded through
 *  the entity tree. Produce them with {@link defineFactory}. */
export interface ComponentFactory {
    attach(entity: Entity, container: DependencyContainer): void
}

/** Collapses a per-component factory into a one-liner: pair a key with a builder
 *  that resolves deps from the run container and returns the component. Co-locate
 *  the result with its component, so adding an aspect is component + key + one
 *  factory line. */
export function defineFactory<T extends object>(
    key: ComponentKey<T>,
    build: (entity: Entity, container: DependencyContainer) => T,
): ComponentFactory {
    return { attach: (entity, container) => entity.add(key, build(entity, container)) }
}
