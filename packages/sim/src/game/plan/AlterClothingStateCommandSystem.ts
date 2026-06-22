import { Lifecycle, scoped } from "tsyringe"
import type { CommandSystem } from "../../core/plan/CommandSystem"
import { completed, failed, invalid, ok, type CommandStatus, type Validation } from "../../core/plan/planTypes"
import { EntityRegistry } from "../entity/EntityRegistry"
import { CharacterLocationKey } from "../character/location/CharacterLocation"
import { ClothingManagerKey } from "../character/clothing/ClothingManager"
import { ALTER_CLOTHING_STATE_COMMAND, type AlterClothingStateCommand } from "./planDefs"
import { Notif, NotificationService } from "../../core/NotificationService"
import { ClothingItemState } from "../item/clothing/ClothingItemState"
import { getName } from "../character/characterViews"
import { CharacterIdentity, CharacterIdentityKey } from "../character/identity/CharacterIdentity"
import { StringUtils } from "../../utils/StringUtils"

/** Sets one of the target's clothing items to a new state. Instant.
 *
 *  Precondition (the drift safety net behind the decomposer's co-location guard):
 *  the acting actor must be at the target's sub-location. For a self-action
 *  (actor === target) this is trivially true. Avatar regeneration is intentionally
 *  *not* done here — it stays in the intent-source handlers. */
@scoped(Lifecycle.ContainerScoped)
export class AlterClothingStateCommandSystem implements CommandSystem<AlterClothingStateCommand> {
    readonly type = ALTER_CLOTHING_STATE_COMMAND

    constructor(
        private readonly registry: EntityRegistry,
        private readonly notificationService: NotificationService
    ) { }

    validate(cmd: AlterClothingStateCommand): Validation {
        const actor = this.registry.getById(cmd.actorId)
        if (!actor) return invalid(`actor ${cmd.actorId} not found`)
        const target = this.registry.getById(cmd.targetId)
        if (!target) return invalid(`target ${cmd.targetId} not found`)
        if (!actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(cmd.targetId)) {
            return invalid(`${cmd.actorId} is not co-located with ${cmd.targetId}`)
        }
        const item = target.require(ClothingManagerKey).getClothingItemById(cmd.clothingId)
        if (!item) return invalid(`clothing item '${cmd.clothingId}' not found on ${cmd.targetId}`)
        if (!item.getStateIds().includes(cmd.stateId)) {
            return invalid(`state '${cmd.stateId}' unknown for clothing item '${cmd.clothingId}'`)
        }
        return ok()
    }

    execute(cmd: AlterClothingStateCommand): CommandStatus {
        const item = this.registry.requireById(cmd.targetId).require(ClothingManagerKey).getClothingItemById(cmd.clothingId)
        if (!item) return failed(`clothing item '${cmd.clothingId}' not found on ${cmd.targetId}`)

        const success = item.setStateById(cmd.stateId)
        this.sendNotificaiton(cmd, item.getCurrentState()!)//todo sstate manager improvements

        return success ? completed() : failed(`could not set '${cmd.clothingId}' to state '${cmd.stateId}'`)
    }


    private sendNotificaiton(cmd: AlterClothingStateCommand, state: ClothingItemState) {
        if (!state.verb) {
            return;
        }
        const actor = this.registry.requireById(cmd.actorId)
        const actorIden = actor.require(CharacterIdentityKey);

        let txt: string
        let actorTxt: string
        if (cmd.actorId == cmd.targetId) {
            txt = `${actorIden.name} ${state.verb} ${actorIden.config.pronouns.hisHer} ${state.getClothingItem().name}`
            actorTxt = `*${StringUtils.capitalizeFirstLetter(state.verb)} my ${state.getClothingItem().name}*`
        } else {
            const target = this.registry.requireById(cmd.targetId)
            const targetIden = target.require(CharacterIdentityKey);
            txt = `${actorIden.name} ${state.verb} ${targetIden.name}'s ${state.getClothingItem().name}`
            actorTxt = `*${StringUtils.capitalizeFirstLetter(state.verb)} ${targetIden.name}'s ${state.getClothingItem().name}*`
        }

        const witnesses = actor.require(CharacterLocationKey).getCurrentLocation().getCharactersInLocation().map(ent => ent.id)

        const notif: Notif = {
            text: txt,
            characterIds: witnesses,
            actorInfo: {
                text: actorTxt,
                actorId: actor.id
            }
        }

        this.notificationService.send(notif)


    }
}
