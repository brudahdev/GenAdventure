import { SimContextItem } from "@gen-adventure/shared";
import { SimpleContextItem } from "../../core/context/ContextItem";
import { LocationCharacterObserver } from "./LocationCharacterObserver";
import { ContextManager } from "../../core/context/ContextManager";

export class LocationContextItem extends SimpleContextItem {
    private unsubScribe: () => void

    characterChangeCallback?: (characterIds: string[]) => void

    constructor(config: SimContextItem, activated = true,
        observer: LocationCharacterObserver,
        contextManager: ContextManager) {

        super(config, activated, contextManager);

        this.unsubScribe = observer.subscribe(this.onCharactersChanged)
    }

    onCharactersChanged = (characterIds: string[]) => {
        this.characterChangeCallback?.(characterIds);
        this.setcharacterIds(characterIds);
    }

    cleanUp() {
        this.unsubScribe();
    }

    delete() {
        this.setValue('');
        this.unsubScribe();
    }
}