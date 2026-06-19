import { LocationConfig, PromptRequest } from "@gen-adventure/shared";
import { SubLocation } from "./SubLocation";
import { LocationBase } from "./LocationBase";
import { LocationCharacterObserver } from "./LocationCharacterObserver";
import { EventSystem } from "../EventSystem";
import { LocationContextItem } from "./LocationContextItem";
import { LocationContextItemFactory } from "./LocationContextItemFactory";
import { CharacterIdentityKey } from "../character/identity/CharacterIdentity";
import { LocationManager } from "./LocationManager";
import { LocationLink } from "./LocationLink";


export class Location extends LocationBase {
    private subLocations = new Map<string, SubLocation>();
    private locationLinks = new Map<string, LocationLink>();

    private characterObserver: LocationCharacterObserver;
    private myContextItem: LocationContextItem;

    constructor(private config: LocationConfig,
        eventSystem: EventSystem,
        contextItemFactory: LocationContextItemFactory,
        private locationManager: LocationManager) {

        super();
        this.characterObserver = new LocationCharacterObserver(eventSystem, locationManager)
        this.characterObserver.setLocation(this)
        this.myContextItem = contextItemFactory.create(
            {
                key: config.id,
                value: '',
                characterIds: []
            },
            this.characterObserver
        );
        this.myContextItem.characterChangeCallback = this.updateContextValue.bind(this)

        for (const subLocationConfig of config.subLocations) {
            const subLocation = new SubLocation(this, subLocationConfig);
            this.subLocations.set(subLocation.id, subLocation);
        }
    }

    linkLocations() {
        for (const locationLinkConfig of this.config.connectedLocations) {
            const locLink = new LocationLink(this.locationManager, locationLinkConfig, this)
            this.locationLinks.set(locLink.getTo().id, locLink)
        }
    }

    get id() {
        return this.config.id;
    }

    getLocationLinks() {
        return this.locationLinks
    }

    getLocationLinkByToId(id: string) {
        return this.locationLinks.get(id)
    }

    getSubLocations() {
        return this.subLocations;
    }

    getSubLocationById(id: string) {
        return this.subLocations.get(id);
    }

    getBackgroundPrompt(): PromptRequest {
        return {
            type: 'background',
            positive: this.config.background_img_txt ?? "",
            negative: this.config.background_img_txt_neg ?? "",
            aspectRatio: { width: 16, height: 9 }
        }
    }

    private updateContextValue() {
        if (this.charactersInLocation.length == 0) {
            this.myContextItem?.setValue("");
            return;
        }
        const names = this.formatCharacterNames();
        let preposition = 'is'
        if (this.charactersInLocation.length > 1)
            preposition = 'are'


        this.myContextItem?.setValue(`${names} ${preposition} ${this.config.context}`)
    }

    private formatCharacterNames() {
        const names = this.charactersInLocation.map(c => c.require(CharacterIdentityKey).name);

        if (names.length === 0) return '';
        if (names.length === 1) return names[0];
        if (names.length === 2) return `${names[0]} and ${names[1]}`;

        return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    }

}