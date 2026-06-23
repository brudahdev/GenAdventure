import { State } from "mistreevous"
import { EntityRegistry } from "../entity/EntityRegistry"
import { LocationManager } from "../location/LocationManager"
import { NotificationService } from "../../core/NotificationService"
import { CharacterLocationKey } from "../character/location/CharacterLocation"
import { CharacterLocomotion } from "../character/locomotion/CharacterLocomotion"
import { CharacterPoseKey } from "../character/pose/CharacterPose"
import { ClothingManagerKey } from "../character/clothing/ClothingManager"
import { isStanding, standPoseId } from "../plan/poseGuards"
import { SubLocation } from "../location/SubLocation"
import { Location } from "../location/Location"
import type { BehaviorParams } from "./BehaviorDefinition"
import { CharacterActionNotifier } from "./CharacterActionNotifier"

export interface BehaviorDeps {
    registry: EntityRegistry
    locationManager: LocationManager
    notificationService: NotificationService
}

/** One mistreevous agent per submitted intent: every action/condition referenced
 *  in a `*Behavior.ts` tree is a method here. mistreevous calls them with `this`
 *  bound to this instance. Leaf logic reads live world state on every step;
 *  notification prose and movement helper live in {@link CharacterActionNotifier}. */
export class CharacterBehaviorAgent {
    private readonly notifier: CharacterActionNotifier

    constructor(
        private readonly deps: BehaviorDeps,
        private readonly params: BehaviorParams,
    ) {
        this.notifier = new CharacterActionNotifier(deps)
    }

    // ---- conditions ----

    IsStanding(): boolean {
        const actor = this.deps.registry.getById(this.params.actorId)
        return actor ? isStanding(actor) : false
    }

    IsCoLocatedWithTarget(): boolean {
        const { actorId, targetId } = this.params
        const actor = this.deps.registry.getById(actorId)
        if (!actor || !targetId) return false
        return actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(targetId)
    }

    // ---- actions ----

    Stand(): State {
        const actor = this.deps.registry.getById(this.params.actorId)
        if (!actor) return State.FAILED
        if (isStanding(actor)) return State.SUCCEEDED

        const standId = standPoseId(actor)
        if (!standId) return State.FAILED

        const pose = actor.require(CharacterPoseKey)
        pose.setPoseById(standId)
        this.notifier.notifyPose(actor.id, actor.id, pose.getCurrentPose())
        return State.SUCCEEDED
    }

    SetPose(): State {
        const { actorId, targetId, poseId } = this.params
        const target = targetId ? this.deps.registry.getById(targetId) : undefined
        if (!target || !poseId) return State.FAILED

        const charPose = target.require(CharacterPoseKey)
        if (!charPose.getPoseById(poseId)) return State.FAILED
        if (!charPose.getAvailablePoseOptions().has(poseId)) return State.FAILED

        charPose.setPoseById(poseId)
        this.notifier.notifyPose(actorId, target.id, charPose.getCurrentPose())
        return State.SUCCEEDED
    }

    HopTowardLocation(): State {
        const { actorId, locationId, subLocationId } = this.params
        const actor = this.deps.registry.getById(actorId)
        if (!actor || !locationId) return State.FAILED

        const loc = this.deps.locationManager.getLocationById(locationId)
        if (!loc) return State.FAILED

        const target: SubLocation | Location = subLocationId
            ? loc.getSubLocationById(subLocationId) ?? loc
            : loc
        return CharacterLocomotion.stepToward(actor, target, this.deps.locationManager, this.notifier)
    }

    HopTowardTarget(): State {
        const { actorId, targetId } = this.params
        const actor = this.deps.registry.getById(actorId)
        const targetChar = targetId ? this.deps.registry.getById(targetId) : undefined
        if (!actor || !targetChar) return State.FAILED

        if (actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(targetChar.id)) {
            return State.SUCCEEDED
        }
        const targetSub = targetChar.require(CharacterLocationKey).getCurrentSubLocation()
        return CharacterLocomotion.stepToward(actor, targetSub, this.deps.locationManager, this.notifier)
    }

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
        this.notifier.notifyClothing(actor.id, target.id, futureState)
        return item.setStateById(stateId) ? State.SUCCEEDED : State.FAILED
    }
}
