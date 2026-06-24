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
        item.value = ""
        this.contextItems.push(item)
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
        this.pushedInitialContext = true;
        this.contextItems.forEach(item => {
            this.sync(item)
        })

    }


    private toContextItem(item: SimContextItem): SimContextItem {
        return {
            key: item.key,
            value: item.value,
            characterIds: item.characterIds
        }
    }
}