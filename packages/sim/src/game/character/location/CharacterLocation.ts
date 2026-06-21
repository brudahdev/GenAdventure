import type { Component } from "../../../core/ec/Component";
import type { Entity } from "../../../core/ec/Entity";
import type { Saveable } from "../../../core/save/Saveable";
import { RESTORE_SOURCE, RestoreSource } from "../../../core/save/RestoreSource";
import { EventSystem } from "../../EventSystem";
import { LocationManager } from "../../location/LocationManager";
import { STARTING_STATE_ADAPTER, type StartingStateAdapter } from "../StartingStateAdapter";
import { SubLocation } from "../../location/SubLocation";
import { defineKey } from "../../../core/ec/ComponentKey";
import { defineFactory } from "../../../core/ec/ComponentFactory";
import { CharacterLocationObserver } from "./CharacterLocationObserver";
import { Location } from "../../location/Location";
import { AvatarKey } from "../Avatar";

export const CharacterLocationKey = defineKey<CharacterLocation>("character.location")

/** {@link CharacterLocation}'s save blob: which sub-location the character is in. */
interface LocationSave { locationId: string; subLocationId: string }

export class CharacterLocation implements Component, Saveable<LocationSave> {
    private currentSubLocation: SubLocation;

    private characterLocationObserver: CharacterLocationObserver;

    constructor(
        private readonly entity: Entity,
        private readonly eventSystem: EventSystem,
        locationManager: LocationManager,
        restore: RestoreSource,
        startingState: StartingStateAdapter,
    ) {
        const roleDefault = (): LocationSave => {
            const roleConfig = startingState.getRoleConfig(entity.id);
            return { locationId: roleConfig.startingLocationId, subLocationId: roleConfig.startingSubLocationId }
        }

        const saved = restore.forEntity<LocationSave>(entity.id, CharacterLocationKey.id, roleDefault)

        // Resolve the saved sub-location; on content drift (location removed)
        // fall back to the role's default rather than failing the load.
        let startingLocation = resolveSubLocation(locationManager, saved)
        if (!startingLocation) {
            if (restore.isResume) {
                console.warn(`[sim] saved location ${saved.locationId}/${saved.subLocationId} for ${entity.id} no longer exists; using role default`)
            }
            startingLocation = resolveSubLocation(locationManager, roleDefault())
        }
        if (!startingLocation) {
            throw new Error("Unable to get starting location for " + entity.id)
        }

        // Place silently — not every subscriber exists yet during construction;
        // init() emits the initial event once the run graph is complete.
        this.currentSubLocation = startingLocation;
        startingLocation.onCharacterEnter(entity);

        this.characterLocationObserver = new CharacterLocationObserver(eventSystem, locationManager, entity.id, this.currentSubLocation.getParent())
    }

    save(): LocationSave {
        return {
            locationId: this.currentSubLocation.getParent().id,
            subLocationId: this.currentSubLocation.id,
        }
    }

    /** Emits the initial `location.changed` (no previous location). */
    init(): void {
        this.emitLocationChanged(undefined)
    }

    getCurrentSubLocation(): SubLocation {
        return this.currentSubLocation;
    }

    getCurrentLocation(): Location {
        return this.getCurrentSubLocation().getParent();
    }

    getCharacterLocationObserver() {
        return this.characterLocationObserver;
    }

    setCurrentSubLocation(loc: SubLocation) {
        if (this.currentSubLocation === loc) {
            return;
        }

        const previousLocation = this.currentSubLocation;
        previousLocation.onCharacterExit(this.entity);

        this.currentSubLocation = loc;
        this.currentSubLocation.onCharacterEnter(this.entity);
        this.entity.get(AvatarKey)?.dirtied();
        this.emitLocationChanged(previousLocation)
    }

    private emitLocationChanged(previousLocation: SubLocation | undefined) {
        this.eventSystem.emit("location.changed", {
            characterId: this.entity.id,
            locationId: this.currentSubLocation.getParent().id,
            subLocationId: this.currentSubLocation.id,
            previousLocationId: previousLocation?.getParent().id,
            previousSubLocationId: previousLocation?.id,
        })
    }

    isAtSameLocationAsOther(characterId: string): boolean {

        return this.currentSubLocation.getParent().containsCharacterWithId(characterId)
    }

    isAtSameSubLocationAsOther(characterId: string): boolean {

        return this.currentSubLocation.containsCharacterWithId(characterId)
    }
}

/** Resolves a `{ locationId, subLocationId }` pair to a live `SubLocation`, or
 *  `undefined` if either is unknown (caller handles the drift). */
function resolveSubLocation(locationManager: LocationManager, save: LocationSave): SubLocation | undefined {
    const parent = locationManager.getLocationById(save.locationId)
    return parent?.getSubLocationById(save.subLocationId) ?? undefined
}

export const characterLocationFactory = defineFactory(CharacterLocationKey, (entity, c) =>
    new CharacterLocation(
        entity,
        c.resolve(EventSystem),
        c.resolve(LocationManager),
        c.resolve<RestoreSource>(RESTORE_SOURCE),
        c.resolve<StartingStateAdapter>(STARTING_STATE_ADAPTER),
    ))

