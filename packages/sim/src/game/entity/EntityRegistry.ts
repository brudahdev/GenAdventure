import { Lifecycle, scoped } from "tsyringe";
import type { ComponentKey } from "../../core/ec/ComponentKey";
import { Entity } from "../../core/ec/Entity";

/** The run's entity store and query layer. Domain-neutral on purpose: it holds
 *  *every* entity regardless of kind, so component queries (`with(...)`) can span
 *  characters, props, vehicles, etc. Assembly and lifecycle live elsewhere — a
 *  spawner (e.g. `CharacterSpawner`) builds entities and `register`s them here.
 *  One per run (container-scoped), discarded with the run's child scope. */
@scoped(Lifecycle.ContainerScoped)
export class EntityRegistry {
    // Insertion order is preserved (Map) so queries return a stable order.
    private readonly entities = new Map<string, Entity>();

    register(entity: Entity): void {
        this.entities.set(entity.id, entity)
    }

    getById(id: string): Entity | undefined {
        return this.entities.get(id)
    }

    /** Like {@link getById} but throws when no entity is registered for `id` —
     *  for the "this entity must exist" lookups. */
    requireById(id: string): Entity {
        const entity = this.entities.get(id)
        if (!entity) {
            throw new Error(`no entity with id ${id}`)
        }
        return entity
    }

    all(): Entity[] {
        return [...this.entities.values()]
    }

    /** All entities that carry every one of the given components. */
    with(...keys: ComponentKey<object>[]): Entity[] {
        return this.all().filter(entity => keys.every(key => entity.has(key)))
    }
}
