import { inject, Lifecycle, scoped } from "tsyringe";

import { Location } from "./Location";
import { LOCATION_CONFIG_ADAPTER, type LocationConfigAdapter } from "./LocationConfigAdapter";
import { EventSystem } from "../EventSystem";
import { LocationContextItemFactory } from "./LocationContextItemFactory";

@scoped(Lifecycle.ContainerScoped)
export class LocationManager {
    private readonly locations = new Map<string, Location>()

    constructor(
        @inject(LOCATION_CONFIG_ADAPTER) private readonly config: LocationConfigAdapter,
        eventSystem: EventSystem,
        contextItemFactory: LocationContextItemFactory
    ) {
        for (const locationConfig of config.getConfig()) {
            this.locations.set(locationConfig.id, new Location(locationConfig, eventSystem, contextItemFactory, this))
        }

        for (const location of this.locations.values()) {
            location.linkLocations();
        }
    }


    getLocationById(id: string) {
        return this.locations.get(id);
    }


}