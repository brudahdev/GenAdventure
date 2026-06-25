import type { BehaviorDefinition } from "../../../behavior/BehaviorDefinition"
import { STAND_UP_SUBTREE } from "../../pose/behavior/standUpSubtree"
import { GO_TO_CHARACTER_SUBTREE } from "../../locomotion/behavior/GoToCharacter/GoToCharacterBehavior"
import { ALTER_CLOTHING_STATE_INTENT } from "./AlterClothingStateIntent"

/** Walk to the target (reusing the goto-character subtree), then alter their
 *  clothing item's state. Composes both shared subtrees. */
const ALTER_CLOTHING_TREE = `
root {
    sequence {
        branch [GoToCharacter]
        action [AlterClothing]
    }
}
${GO_TO_CHARACTER_SUBTREE}
${STAND_UP_SUBTREE}`

/** Behaviour for the {@link import("./AlterClothingStateIntent").AlterClothingStateIntent}. */
export const ALTER_CLOTHING_BEHAVIOR: BehaviorDefinition = {
    type: ALTER_CLOTHING_STATE_INTENT,
    tree: ALTER_CLOTHING_TREE,
}
