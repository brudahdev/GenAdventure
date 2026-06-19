import { Lifecycle, scoped } from "tsyringe";
import { EventSystem } from "../../game/EventSystem";
import { SimContextItem } from "@gen-adventure/shared";

@scoped(Lifecycle.ContainerScoped)
export class ContextManager {
    private contextItems: SimContextItem[] = []
    private pushedInitialContext = false;
    constructor(private readonly eventSystem: EventSystem) {

    }


    addItem(item: SimContextItem) {
        this.contextItems.push(item)
    }

    removeItem(item: SimContextItem) {
        //todo
    }

    sync(item: SimContextItem) {
        if (!this.pushedInitialContext) {
            return;
        }
        //todo
        this.eventSystem.emit("context", this.toContextItem(item))
    }

    syncRemove(item: SimContextItem) {
        if (!this.pushedInitialContext) {
            return;
        }
        this.eventSystem.emit("context", this.toContextItem(item))
    }

    pushInitaialContext() {
        this.contextItems.forEach(item => {
            this.eventSystem.emit("context", this.toContextItem(item))
        })

        this.pushedInitialContext = true;
    }


    private toContextItem(item: SimContextItem) {
        return {
            key: item.key,
            value: item.value,
            characterIds: item.characterIds
        }
    }
}