import { Lifecycle, scoped } from "tsyringe"
import { GO_TO_COMMAND, GoToCommand } from "./GoToCommand"
import { CommandSystem } from "../../../../core/plan/CommandSystem"
import { EntityRegistry } from "../../../entity/EntityRegistry"
import { CommandStatus, completed, invalid, ok, Validation } from "../../../../core/plan/planTypes"
import { isStanding } from "../../../plan/poseGuards"
import { CharacterLocomotionKey } from "../CharacterLocomotion"
import { CharacterLocationKey } from "../../location/CharacterLocation"
import { Notif, NotificationService } from "../../../../core/NotificationService"
import { CharacterIdentityKey } from "../../identity/CharacterIdentity"
import { LocationManager } from "../../../location/LocationManager"
import { SubLocation } from "../../../location/SubLocation"
import { Location } from "../../../location/Location"

@scoped(Lifecycle.ContainerScoped)
export class GoToCommandSystem implements CommandSystem<GoToCommand> {
    readonly type = GO_TO_COMMAND

    constructor(
        private readonly registry: EntityRegistry,
        private readonly notificationService: NotificationService,
        private readonly locationManager: LocationManager,
    ) { }

    validate(cmd: GoToCommand): Validation {
        const actor = this.registry.getById(cmd.actorId)
        if (!actor) return invalid(`actor ${cmd.actorId} not found`)

        if (!isStanding(actor)) return invalid(`${cmd.actorId} must be standing to move`)


        const actorLocation = actor.require(CharacterLocationKey)

        let locationIsValid = true;
        if (cmd.locationId) {
            actorLocation.getCurrentLocation().getLocationLinkByToId(cmd.locationId)
        }

        let subLocationIsValid = true;

        if (cmd.subLocationId && !actorLocation.getCurrentLocation().getSubLocationById(cmd.subLocationId)) {
            subLocationIsValid = false;
        }
        if (!locationIsValid || !subLocationIsValid) {
            return invalid(`'${cmd.locationId}' is not reachable from ${cmd.actorId}'s current location`)
        }
        return ok()
    }

    execute(cmd: GoToCommand): CommandStatus {
        const actor = this.registry.requireById(cmd.actorId)
        const actorLocomotion = actor.require(CharacterLocomotionKey);
        const actorLocation = actor.require(CharacterLocationKey);

        if (cmd.subLocationId) {
            const previousSubLocation = actorLocation.getCurrentSubLocation();
            actorLocomotion.gotoNearbyLocation(cmd.subLocationId)
            this.sendNotificaiton(cmd, previousSubLocation, undefined);

        } else if (cmd.locationId) {
            const previousLocation = actorLocation.getCurrentLocation();
            actorLocomotion.gotoNearbyLocation(cmd.locationId)
            this.sendNotificaiton(cmd, undefined, previousLocation);

        }

        return completed()
    }

    private sendNotificaiton(
        cmd: GoToCommand,
        previousSubLocation: SubLocation | undefined,
        previousLocation: Location | undefined
    ) {
        //todo verb should come from transition?
        const actor = this.registry.requireById(cmd.actorId)
        const actorIden = actor.require(CharacterIdentityKey);
        const actorLoc = actor.require(CharacterLocationKey)

        let txt = ""
        let actorTxt = ""
        if (previousSubLocation) {
            txt = `${actorIden.name} went ${actorLoc.getCurrentSubLocation().onEnterText}`
            actorTxt = `*Goes ${actorLoc.getCurrentSubLocation().onEnterText}*`
        }

        if (previousLocation) {
            txt = `${actorIden.name} went ${actorLoc.getCurrentSubLocation().getParent().onEnterText}`
        }
        if (!txt) {
            return;
        }


        const witnesses = actor.require(CharacterLocationKey).getCurrentLocation().getCharactersInLocation().map(ent => ent.id)

        const notif: Notif = {
            text: txt,
            characterIds: witnesses,
        }

        if (actorTxt) {
            notif.actorInfo = {
                text: actorTxt,
                actorId: actor.id
            }
        }

        this.notificationService.send(notif)
    }
}
