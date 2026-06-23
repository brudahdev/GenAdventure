import { State } from "mistreevous"
import type { Entity } from "../../core/ec/Entity"
import { EntityRegistry } from "../entity/EntityRegistry"
import { LocationManager } from "../location/LocationManager"
import { NotificationService, type Notif } from "../../core/NotificationService"
import { CharacterLocationKey } from "../character/location/CharacterLocation"
import { CharacterPoseKey } from "../character/pose/CharacterPose"
import { CharacterLocomotionKey } from "../character/locomotion/CharacterLocomotion"
import { ClothingManagerKey } from "../character/clothing/ClothingManager"
import { CharacterIdentityKey } from "../character/identity/CharacterIdentity"
import { isStanding, standPoseId } from "../plan/poseGuards"
import { calcPath } from "../plan/locationPath"
import { SubLocation } from "../location/SubLocation"
import { Location } from "../location/Location"
import { Pose } from "../character/pose/Pose"
import { ClothingItemState } from "../item/clothing/ClothingItemState"
import { StringUtils } from "../../utils/StringUtils"
import type { BehaviorParams } from "./BehaviorDefinition"

export interface BehaviorDeps {
    registry: EntityRegistry
    locationManager: LocationManager
    notificationService: NotificationService
}

/** One mistreevous agent per submitted intent: every action/condition referenced
 *  in a `*Behavior.ts` tree is a method here. mistreevous calls them with `this`
 *  bound to this instance. The state mutation + witness notifications that used to
 *  live in the deleted `*CommandSystem`s now live here, recomputed from live world
 *  state on each step. Conditions return `boolean`; actions return {@link State}
 *  (`RUNNING` keeps a leaf alive across ticks). */
export class CharacterBehaviorAgent {
    constructor(
        private readonly deps: BehaviorDeps,
        private readonly params: BehaviorParams,
    ) { }

    // ---- conditions ----

    /** Guard/condition: is the actor currently upright? */
    IsStanding(): boolean {
        const actor = this.deps.registry.getById(this.params.actorId)
        return actor ? isStanding(actor) : false
    }

    /** Condition: is the actor already at the target character's sub-location?
     *  Trivially true for a self-action. Lets the goto-character subtree
     *  short-circuit before standing/walking (matching the old decomposer, which
     *  returned an empty expansion when already co-located). */
    IsCoLocatedWithTarget(): boolean {
        const { actorId, targetId } = this.params
        const actor = this.deps.registry.getById(actorId)
        if (!actor || !targetId) return false
        return actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(targetId)
    }

    // ---- actions ----

    /** Stand the actor up (idempotent). Used as the standing guarantee before moving. */
    Stand(): State {
        const actor = this.deps.registry.getById(this.params.actorId)
        if (!actor) return State.FAILED
        if (isStanding(actor)) return State.SUCCEEDED

        const standId = standPoseId(actor)
        if (!standId) return State.FAILED

        const pose = actor.require(CharacterPoseKey)
        pose.setPoseById(standId)
        this.notifyPose(actor.id, actor.id, pose.getCurrentPose())
        return State.SUCCEEDED
    }

    /** Set the target's pose (the Pose intent's primitive). */
    SetPose(): State {
        const { actorId, targetId, poseId } = this.params
        const target = targetId ? this.deps.registry.getById(targetId) : undefined
        if (!target || !poseId) return State.FAILED

        const charPose = target.require(CharacterPoseKey)
        if (!charPose.getPoseById(poseId)) return State.FAILED
        if (!charPose.getAvailablePoseOptions().has(poseId)) return State.FAILED

        charPose.setPoseById(poseId)
        this.notifyPose(actorId, target.id, charPose.getCurrentPose())
        return State.SUCCEEDED
    }

    /** One hop toward the intent's fixed location target. */
    HopTowardLocation(): State {
        const { actorId, locationId, subLocationId } = this.params
        const actor = this.deps.registry.getById(actorId)
        if (!actor || !locationId) return State.FAILED

        const loc = this.deps.locationManager.getLocationById(locationId)
        if (!loc) return State.FAILED

        const target: SubLocation | Location = subLocationId
            ? loc.getSubLocationById(subLocationId) ?? loc
            : loc
        return this.stepToward(actor, target)
    }

    /** One hop toward the *target character's current* sub-location. Re-reading it
     *  every step is what makes goto-character reactive to the target moving. */
    HopTowardTarget(): State {
        const { actorId, targetId } = this.params
        const actor = this.deps.registry.getById(actorId)
        const targetChar = targetId ? this.deps.registry.getById(targetId) : undefined
        if (!actor || !targetChar) return State.FAILED

        if (actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(targetChar.id)) {
            return State.SUCCEEDED
        }
        const targetSub = targetChar.require(CharacterLocationKey).getCurrentSubLocation()
        return this.stepToward(actor, targetSub)
    }

    /** Set one of the target's clothing items to a new state (the clothing
     *  intent's primitive). Co-location is the precondition the goto-character
     *  subtree satisfies; re-checked here as a drift safety net. */
    AlterClothing(): State {
        const { actorId, targetId, clothingId, stateId } = this.params
        const actor = this.deps.registry.getById(actorId)
        const target = targetId ? this.deps.registry.getById(targetId) : undefined
        if (!actor || !target || !clothingId || !stateId) return State.FAILED
        if (!actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(target.id)) {
            return State.FAILED
        }

        const item = target.require(ClothingManagerKey).getClothingItemById(clothingId)
        if (!item) return State.FAILED
        if (!item.getStateIds().includes(stateId)) return State.FAILED

        const futureState = item.getStateById(stateId)!
        this.notifyClothing(actor.id, target.id, futureState)
        return item.setStateById(stateId) ? State.SUCCEEDED : State.FAILED
    }

    // ---- movement helper ----

    /** Take exactly one hop toward `target`: SUCCEEDED when already there, FAILED
     *  when unreachable, RUNNING after a hop (so the next hop happens next step). */
    private stepToward(actor: Entity, target: SubLocation | Location): State {
        const actorLoc = actor.require(CharacterLocationKey)
        const currentSub = actorLoc.getCurrentSubLocation()

        const arrived = target instanceof SubLocation
            ? currentSub === target
            : currentSub.getParent() === target
        if (arrived) return State.SUCCEEDED

        if (!isStanding(actor)) return State.FAILED // backstop for the while(IsStanding) guard

        const path = calcPath(this.deps.locationManager, currentSub, target)
        if (path.length === 0) return State.FAILED // unreachable

        const step = path[0]
        const stepIsSubLocation = !this.deps.locationManager.getLocationById(step)
        const previousSub = currentSub
        const previousLoc = currentSub.getParent()

        actor.require(CharacterLocomotionKey).gotoNearbyLocation(step)
        this.notifyGoTo(
            actor,
            stepIsSubLocation ? previousSub : undefined,
            stepIsSubLocation ? undefined : previousLoc,
        )
        return State.RUNNING
    }

    // ---- notifications (ported verbatim from the old command systems) ----

    private notifyGoTo(actor: Entity, previousSub?: SubLocation, previousLoc?: Location): void {
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

    private notifyPose(actorId: string, targetId: string, pose: Pose): void {
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

    private notifyClothing(actorId: string, targetId: string, state: ClothingItemState): void {
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
