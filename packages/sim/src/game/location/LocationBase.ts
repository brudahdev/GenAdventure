import type { Entity } from "../../core/ec/Entity";


export class LocationBase {
    protected charactersInLocation: Entity[] = [];

    getCharactersInLocation() {
        return this.charactersInLocation;
    }

    onCharacterEnter(entity: Entity) {
        if (!this.charactersInLocation.includes(entity)) {
            this.charactersInLocation.push(entity);
        }
    }

    onCharacterExit(entity: Entity) {
        this.charactersInLocation = this.charactersInLocation.filter(c => c !== entity);
    }

    containsCharacterWithId(characterId: string): boolean {
        return this.charactersInLocation.some(entity => entity.id == characterId);
    }
}
