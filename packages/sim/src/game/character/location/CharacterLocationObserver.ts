import { EventSystem } from "../../EventSystem";
import { LocationCharacterObserver } from "../../location/LocationCharacterObserver";
import { Location } from "../../location/Location";
import { GameEvents } from "../../GameEvents";
import { LocationManager } from "../../location/LocationManager";

//Observes characterIds in the same location as a given character
export class CharacterLocationObserver extends LocationCharacterObserver {
    constructor(eventSystem: EventSystem, locationManager: LocationManager, private characterId: string, location: Location) {
        super(eventSystem, locationManager);
        this.setLocation(location)
    }

    protected onCharacterChangeLocation(event: GameEvents["location.changed"]) {
        const forMyCharacter = event.characterId == this.characterId;
        if (!forMyCharacter) {
            super.onCharacterChangeLocation(event);
            return;
        }
        if (!this.newLocationApplies(event)) {
            return;
        }

        this.setLocationById(event.locationId);
        this.emit();
    }
}