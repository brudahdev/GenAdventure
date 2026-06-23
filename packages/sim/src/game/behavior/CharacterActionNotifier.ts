import type { Entity } from "../../core/ec/Entity"
import { EntityRegistry } from "../entity/EntityRegistry"
import { LocationManager } from "../location/LocationManager"
import { NotificationService, type Notif } from "../../core/NotificationService"
import { CharacterIdentityKey } from "../character/identity/CharacterIdentity"
import { CharacterLocationKey } from "../character/location/CharacterLocation"
import { CharacterPoseKey } from "../character/pose/CharacterPose"
import { SubLocation } from "../location/SubLocation"
import { Location } from "../location/Location"
import { Pose } from "../character/pose/Pose"
import { ClothingItemState } from "../item/clothing/ClothingItemState"
import { StringUtils } from "../../utils/StringUtils"
import type { BehaviorDeps } from "./CharacterBehaviorAgent"

/** Notification prose extracted from
 *  {@link import("./CharacterBehaviorAgent").CharacterBehaviorAgent}.
 *  Constructed once per submitted intent, reused across leaf calls. */
export class CharacterActionNotifier {
    constructor(private readonly deps: BehaviorDeps) { }

    notifyGoTo(actor: Entity, previousSub?: SubLocation, previousLoc?: Location): void {
        const actorIden = actor.require(CharacterIdentityKey)
        const actorLoc = actor.require(CharacterLocationKey)

        let txt = ""
        let actorTxt = ""
        if (previousSub) {
            txt = `${actorIden.name} went ${actorLoc.getCurrentSubLocation().onEnterText}`
            actorTxt = `*Goes ${actorLoc.getCurrentSubLocation().onEnterText}*`
        }
        if (previousLoc) {
            txt = `${actorIden.name} went ${actorLoc.getCurrentSubLocation().getParent().onEnterText}`
        }
        if (!txt) return

        const witnesses = actorLoc.getCurrentLocation().getCharactersInLocation().map(ent => ent.id)
        const notif: Notif = { text: txt, characterIds: witnesses }
        if (actorTxt) notif.actorInfo = { text: actorTxt, actorId: actor.id }
        this.deps.notificationService.send(notif)
    }

    notifyPose(actorId: string, targetId: string, pose: Pose): void {
        const actor = this.deps.registry.requireById(actorId)
        const actorIden = actor.require(CharacterIdentityKey)

        let txt: string
        let actorTxt: string

        if (actorId === targetId) {
            const charPose = actor.require(CharacterPoseKey)
            txt = `${actorIden.name} ${pose.verb}. ${StringUtils.capitalizeFirstLetter(actorIden.config.pronouns.heShe)} is now ${charPose.getLocationPoseContextPrompt()}.`
            actorTxt = `*${pose.verb}*`
        } else {
            const target = this.deps.registry.requireById(targetId)
            const targetIden = target.require(CharacterIdentityKey)
            const charPose = target.require(CharacterPoseKey)

            // "sits down" → "sits <target> down"
            const verbParts = pose.verb.trim().split(/\s+/)
            const firstPart = verbParts[0]
            let lastPart: string | undefined = verbParts[verbParts.length - 1]
            if (firstPart === lastPart) lastPart = undefined

            const modifiedVerb = `${firstPart} ${targetIden.name}${lastPart ? (" " + lastPart) : ""}`
            txt = `${actorIden.name} ${modifiedVerb}. ${targetIden.name} is now ${charPose.getLocationPoseContextPrompt()}.`
            actorTxt = `*${pose.verb} ${targetIden.name}*`
        }

        const witnesses = actor.require(CharacterLocationKey).getCurrentLocation().getCharactersInLocation().map(ent => ent.id)
        this.deps.notificationService.send({
            text: txt,
            characterIds: witnesses,
            actorInfo: { text: actorTxt, actorId: actor.id },
        })
    }

    notifyClothing(actorId: string, targetId: string, state: ClothingItemState): void {
        const actor = this.deps.registry.requireById(actorId)
        const actorIden = actor.require(CharacterIdentityKey)

        let txt: string
        let actorTxt: string

        if (actorId === targetId) {
            txt = `${actorIden.name} ${state.verb} ${actorIden.config.pronouns.hisHer} ${state.getClothingItem().name}`
            actorTxt = `*${StringUtils.capitalizeFirstLetter(state.verb)} my ${state.getClothingItem().name}*`
        } else {
            const target = this.deps.registry.requireById(targetId)
            const targetIden = target.require(CharacterIdentityKey)
            txt = `${actorIden.name} ${state.verb} ${targetIden.name}'s ${state.getClothingItem().name}`
            actorTxt = `*${StringUtils.capitalizeFirstLetter(state.verb)} ${targetIden.name}'s ${state.getClothingItem().name}*`
        }

        const witnesses = actor.require(CharacterLocationKey).getCurrentLocation().getCharactersInLocation().map(ent => ent.id)
        this.deps.notificationService.send({
            text: txt,
            characterIds: witnesses,
            actorInfo: { text: actorTxt, actorId: actor.id },
        })
    }
}
