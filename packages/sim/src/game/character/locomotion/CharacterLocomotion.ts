import { PLAYER_CHARACTER_ID, type NearbyLocationSummary } from "@gen-adventure/shared";
import { Component } from "../../../core/ec/Component";
import { defineKey } from "../../../core/ec/ComponentKey";
import { defineFactory } from "../../../core/ec/ComponentFactory";
import { Entity } from "../../../core/ec/Entity";
import { EventSystem } from "../../EventSystem";
import { SubLocation } from "../../location/SubLocation";
import { Location } from "../../location/Location";
import { CharacterLocation, CharacterLocationKey } from "../location/CharacterLocation";
import { LocationLink } from "../../location/LocationLink";
import { LocomotionInferenceAction } from "./LocomotionInferenceAction";
import { InferenceActionManager } from "../../../core/action-inference/InferenceActionManager";
import { EntityRegistry } from "../../entity/EntityRegistry";
import { PlanExecutor } from "../../plan/PlanExecutor";

export const CharacterLocomotionKey = defineKey<CharacterLocomotion>("character.locomotion")
export const characterLocomotionFactory = defineFactory(CharacterLocomotionKey, (entity, c) =>
    new CharacterLocomotion(
        entity,
        c.resolve(EventSystem),
        c.resolve(InferenceActionManager),
        c.resolve(EntityRegistry),
        c.resolve(PlanExecutor)
    )
)

export class CharacterLocomotion implements Component {

    private charLocation: CharacterLocation;

    private inferenceAction?: LocomotionInferenceAction;


    constructor(
        private readonly entity: Entity,
        private readonly eventSystem: EventSystem,
        inferenceManager: InferenceActionManager,
        registry: EntityRegistry,
        planExecutor: PlanExecutor,
    ) {
        this.charLocation = entity.require(CharacterLocationKey);

        if (entity.id != PLAYER_CHARACTER_ID) {
            this.inferenceAction = new LocomotionInferenceAction(this.entity, eventSystem, inferenceManager, registry, planExecutor);
        }
    }

    init(): void {

    }

    gotoNearbyLocation(locationId: string) {
        const location = this.findNearbyLocationById(locationId);
        if (!location) {
            return // return false? throw? Where should validation happen? The command layer or here?
        }

        if (location instanceof SubLocation) {
            this.charLocation.setCurrentSubLocation(location)
            ///todo notification
            return;
        }

        if (location instanceof LocationLink) {
            ///todo distance over time stuff.

            //todo use the scheduler here


            this.charLocation.setCurrentSubLocation(location.getToDefaultSubLocation())
        }
    }



    findNearbyLocationByTag(tag: string): LocationLink | SubLocation | undefined {
        const currentLocation = this.charLocation.getCurrentLocation();

        const subLoc = currentLocation.getSubLocationByTag(tag);
        if (subLoc) {
            return subLoc;
        }

        const locationLink = currentLocation.getLocationLinkByToTag(tag)
        if (locationLink) {
            return locationLink
        }

        return undefined;
    }


    findNearbyLocationById(locationId: string): LocationLink | SubLocation | undefined {
        const currentLocation = this.charLocation.getCurrentLocation();

        const subLoc = currentLocation.getSubLocationById(locationId);
        if (subLoc) {
            return subLoc;
        }

        const locationLink = currentLocation.getLocationLinkByToId(locationId)
        if (locationLink) {
            return locationLink
        }

        return undefined;
    }





    getNearbyLocationSummary(): NearbyLocationSummary {
        const summary: NearbyLocationSummary = {
            subLocations: [],
            locations: [],
        }

        const currentLocation = this.charLocation.getCurrentLocation();

        for (const subLoc of currentLocation.getSubLocations().values()) {
            if (subLoc == this.charLocation.getCurrentSubLocation()) {
                continue;
            }
            summary.subLocations.push({
                id: subLoc.id
            })
        }

        for (const link of currentLocation.getLocationLinks().values()) {
            summary.locations.push({
                id: link.getTo().id,
            })
        }

        return summary;
    }
}