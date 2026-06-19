//Observes characterIds in a given location
import { Location } from "./Location";
import { CharacterObserver } from "../character/appearance/CharacterObserver";
import { GameEvents } from "../GameEvents";
import { EventSystem } from "../EventSystem";
import { LocationManager } from "./LocationManager";

export class LocationCharacterObserver extends CharacterObserver {
    private location?: Location
    constructor(private eventSystem: EventSystem, private locationManager: LocationManager) {
        super()
        eventSystem.on('location.changed', (args) => {
            if (!this.location) {
                return;
            }
            this.onCharacterChangeLocation(args);
        })
    }

    setLocation(location: Location) {
        this.location = location;
        this.emit();
    }

    setLocationById(locationId: string) {
        const newLocation = this.locationManager.getLocationById(locationId);
        if (!newLocation) {
            return
        }
        this.setLocation(newLocation)
    }

    getCharacterIds(): string[] {
        return this.location?.getCharactersInLocation().map(entity => entity.id) ?? []
    }

    protected onCharacterChangeLocation(event: GameEvents["location.changed"]) {
        if (!this.newLocationApplies(event)) {
            return;
        }
        this.emit();
    }

    protected newLocationApplies(event: GameEvents["location.changed"]): boolean {
        if (!this.location) {
            return false;
        }
        let forMyLocation = this.location.id.includes(event.locationId) ||
            this.location.id.includes(event.previousLocationId ?? '');

        let onlySublocationChange = event.previousSubLocationId == event.subLocationId;

        return forMyLocation && !onlySublocationChange
    }
}