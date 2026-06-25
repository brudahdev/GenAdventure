import type { BehaviorDefinition } from "../../../../behavior/BehaviorDefinition"
import { STAND_UP_SUBTREE } from "../../../pose/behavior/standUpSubtree"
import { GOTO_CHARACTER_INTENT } from "./GoToCharacter"

/** Walk to the target character's *current* sub-location (reactive), standing
 *  first. Short-circuits when already co-located — so a self/co-located action
 *  doesn't pointlessly stand the actor. `HopTowardTarget` re-reads the target's
 *  position each step, so it re-paths when the target moves. Exported as a named
 *  subtree so the clothing tree can reuse it via `branch [GoToCharacter]`. */
export const GO_TO_CHARACTER_SUBTREE = `
root [GoToCharacter] {
    selector {
        condition [IsCoLocatedWithTarget]
        sequence {
            branch [StandUp]
            action [HopTowardTarget] while(IsStanding)
        }
    }
}`

const GO_TO_CHARACTER_TREE = `
root {
    branch [GoToCharacter]
}
${GO_TO_CHARACTER_SUBTREE}
${STAND_UP_SUBTREE}`

/** Behaviour for the {@link import("./GoToCharacter").GoToCharacterIntent}. */
export const GOTO_CHARACTER_BEHAVIOR: BehaviorDefinition = {
    type: GOTO_CHARACTER_INTENT,
    tree: GO_TO_CHARACTER_TREE,
}
