import { LocationLinkConfig } from "@gen-adventure/shared";
import { LocationManager } from "./LocationManager";
import { Location } from "./Location";
import { SubLocation } from "./SubLocation";

export class LocationLink {
    private from: Location;
    private to: Location;
    private toDefaultSubLocation: SubLocation;


    constructor(locationManager: LocationManager, private config: LocationLinkConfig, from: Location) {
        this.from = from;

        const to = locationManager.getLocationById(this.config.locationId)
        if (!to) {
            throw new Error("unable to find location with id " + this.config.locationId)
        }
        this.to = to;

        const toSubLocation = to.getSubLocationById(this.config.defaultSubLocationId)
        if (!toSubLocation) {
            throw new Error(`unable to find sublocation with id ${this.config.defaultSubLocationId} under location ${this.config.locationId}`)
        }
        this.toDefaultSubLocation = toSubLocation;
    }

    getTo() {
        return this.to;
    }

    getToDefaultSubLocation() {
        return this.toDefaultSubLocation
    }
}