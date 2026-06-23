import { Lifecycle, injectAll, scoped } from "tsyringe"
import { BEHAVIOR_DEFINITION, type BehaviorDefinition } from "./BehaviorDefinition"

/** Indexes every {@link BehaviorDefinition} registered for the run (under the
 *  {@link BEHAVIOR_DEFINITION} token in `SimProvisioner`) by its intent `type`,
 *  so the {@link import("./BehaviorDispatcher").BehaviorDispatcher} can look a
 *  tree up without a central map. Adding an intent = register one more
 *  definition; nothing here changes. */
@scoped(Lifecycle.ContainerScoped)
export class BehaviorRegistry {
    private readonly byType = new Map<string, BehaviorDefinition>()

    constructor(@injectAll(BEHAVIOR_DEFINITION) defs: BehaviorDefinition[]) {
        for (const def of defs) this.byType.set(def.type, def)
    }

    get(type: string): BehaviorDefinition | undefined {
        return this.byType.get(type)
    }
}
