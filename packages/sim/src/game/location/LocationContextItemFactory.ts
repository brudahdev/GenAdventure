import { Lifecycle, scoped } from "tsyringe";
import { SimContextItem } from "@gen-adventure/shared";
import { ContextManager } from "../../core/context/ContextManager";
import { LocationCharacterObserver } from "./LocationCharacterObserver";
import { LocationContextItem } from "./LocationContextItem";

@scoped(Lifecycle.ContainerScoped)
export class LocationContextItemFactory {
    constructor(private readonly contextManager: ContextManager) {}

    create(
        config: SimContextItem,
        observer: LocationCharacterObserver,
        activated = true,
    ): LocationContextItem {
        return new LocationContextItem(config, activated, observer, this.contextManager);
    }
}
