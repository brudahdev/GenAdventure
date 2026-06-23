import { POSE_INTENT } from "../character/pose/behavior/PoseIntent"
import { GO_TO_INTENT } from "../character/locomotion/behavior/GoToIntent"
import { GOTO_CHARACTER_INTENT } from "../character/locomotion/behavior/GoToCharacter/GoToCharacter"
import { ALTER_CLOTHING_STATE_INTENT } from "../character/clothing/behavior/AlterClothingStateIntent"

/** The mistreevous (MDSL) behaviour-tree definitions, one per intent type, that
 *  replace the old intent→command decomposers. Composition is by named-root
 *  *subtrees* (`branch [Name]`), which is what lets clothing reuse goto-character,
 *  goto-character reuse goto-location's standing logic, and so on. The leaf
 *  actions/conditions named here resolve to methods on
 *  {@link import("./CharacterBehaviorAgent").CharacterBehaviorAgent}.
 *
 *  Leaves recompute against live world state every step, so:
 *   - movement is one hop per step (`RUNNING` until arrived), spanning ticks;
 *   - `HopTowardTarget` re-reads the *target's current* sub-location each step,
 *     so a goto-character re-paths reactively when the target moves;
 *   - the `while(IsStanding)` guard keeps a move bound to the actor being upright
 *     (it stands first via the `StandUp` subtree). */

/** Stand up if not already standing. Idempotent — succeeds immediately when
 *  already upright. Referenced by every tree that moves. */
const STAND_UP_SUBTREE = `
root [StandUp] {
    selector {
        condition [IsStanding]
        action [Stand]
    }
}`

/** Walk to the goto-character target's current sub-location (reactive), standing
 *  first. Short-circuits when already co-located — so a self/co-located action
 *  doesn't pointlessly stand the actor (matches the old decomposer's empty
 *  expansion when co-located). Shared by the clothing tree. */
const GO_TO_CHARACTER_SUBTREE = `
root [GoToCharacter] {
    selector {
        condition [IsCoLocatedWithTarget]
        sequence {
            branch [StandUp]
            action [HopTowardTarget] while(IsStanding)
        }
    }
}`

export const POSE_TREE = `
root {
    action [SetPose]
}`

export const GO_TO_LOCATION_TREE = `
root {
    sequence {
        branch [StandUp]
        action [HopTowardLocation] while(IsStanding)
    }
}
${STAND_UP_SUBTREE}`

export const GO_TO_CHARACTER_TREE = `
root {
    branch [GoToCharacter]
}
${GO_TO_CHARACTER_SUBTREE}
${STAND_UP_SUBTREE}`

export const ALTER_CLOTHING_TREE = `
root {
    sequence {
        branch [GoToCharacter]
        action [AlterClothing]
    }
}
${GO_TO_CHARACTER_SUBTREE}
${STAND_UP_SUBTREE}`

/** Intent `type` → MDSL definition. The dispatcher looks the tree up here. */
export const TREES: Record<string, string> = {
    [POSE_INTENT]: POSE_TREE,
    [GO_TO_INTENT]: GO_TO_LOCATION_TREE,
    [GOTO_CHARACTER_INTENT]: GO_TO_CHARACTER_TREE,
    [ALTER_CLOTHING_STATE_INTENT]: ALTER_CLOTHING_TREE,
}
