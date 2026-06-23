import type { ActorIntent } from "../../../../plan/planDefs"
import type { BehaviorDefinition } from "../../../../behavior/BehaviorDefinition"
import { STAND_UP_SUBTREE } from "../../../pose/behavior/standUpSubtree"
import { GO_TO_CHARACTER_SUBTREE } from "../../../locomotion/behavior/GoToCharacter/GoToCharacterBehavior"
import { TOUCH_INTENT, type TouchIntent } from "./TouchIntent"

/** Walk to the target (reusing the goto-character subtree, which short-circuits for
 *  a co-located/self touch), then apply the touch interaction. Composes the same
 *  shared subtrees as the clothing tree. */
const TOUCH_TREE = `
root {
    sequence {
        branch [GoToCharacter]
        action [Touch]
    }
}
${GO_TO_CHARACTER_SUBTREE}
${STAND_UP_SUBTREE}`

/** Behaviour for the {@link TouchIntent}. */
export const TOUCH_BEHAVIOR: BehaviorDefinition = {
    type: TOUCH_INTENT,
    tree: TOUCH_TREE,
    toParams: (intent: ActorIntent) => {
        const i = intent as TouchIntent
        return {
            actorId: i.actorId,
            targetId: i.targetId,
            actorPartTag: i.actorPartTag,
            targetPartTag: i.targetPartTag,
            verb: i.verb,
        }
    },
}
