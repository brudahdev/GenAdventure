import { Lifecycle, scoped } from "tsyringe"
import type { State } from "mistreevous"
import type { BehaviorContext, LeafImpl, LeafSet } from "./BehaviorContext"
import { POSE_LEAVES } from "../character/pose/behavior/poseLeaves"
import { LOCOMOTION_LEAVES } from "../character/locomotion/behavior/locomotionLeaves"
import { CLOTHING_LEAVES } from "../character/clothing/behavior/clothingLeaves"
import { TOUCH_LEAVES } from "../character/body/touch/behavior/touchLeaves"

/** Every domain's leaf-set. Imported here (in the dispatcher graph, the same
 *  load position the old `CharacterBehaviorAgent`'s heavy component imports used
 *  to occupy) rather than registered from `SimProvisioner` — the provisioner is
 *  the earliest-loaded module, and pulling the component-key graph in that early
 *  exposes a pre-existing import cycle in the body/touch modules. Adding an
 *  intent = add its `*Leaves.ts` to this list. */
const LEAF_SETS: readonly LeafSet[] = [POSE_LEAVES, LOCOMOTION_LEAVES, CLOTHING_LEAVES, TOUCH_LEAVES]

/** The composed agent handed to mistreevous: leaf name → zero-config method that
 *  mistreevous calls by name off the tree. */
type MistreevousLeaves = Record<string, (...args: unknown[]) => State | boolean>

/** Flattens every domain {@link LeafSet} into one name→leaf map so the
 *  {@link import("./BehaviorDispatcher").BehaviorDispatcher} can build a
 *  per-submission mistreevous agent without a central god-class. Throws on a
 *  duplicate leaf name so two domains can't silently clash. */
@scoped(Lifecycle.ContainerScoped)
export class BehaviorLeafRegistry {
    private readonly byName = new Map<string, LeafImpl>()

    constructor() {
        for (const set of LEAF_SETS) {
            for (const [name, fn] of Object.entries(set.leaves)) {
                if (this.byName.has(name)) {
                    throw new Error(`duplicate behaviour leaf '${name}' registered`)
                }
                this.byName.set(name, fn)
            }
        }
    }

    /** Builds the single agent object mistreevous binds to a tree: every leaf
     *  closed over this submission's {@link BehaviorContext}. */
    compose(ctx: BehaviorContext): MistreevousLeaves {
        const agent: MistreevousLeaves = {}
        for (const [name, fn] of this.byName) {
            agent[name] = (...args: unknown[]) => fn(ctx, ...args)
        }
        return agent
    }
}
