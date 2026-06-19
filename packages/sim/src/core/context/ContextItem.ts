import { SimContextItem } from "@gen-adventure/shared";
import { ContextManager } from "./ContextManager";


export class SimpleContextItem implements SimContextItem {
    private myKey: string;
    private myValue: string;
    private mycharacterIds: Set<string> | undefined;

    private contextIsAdded: boolean = false;
    private isDisableSync = false;
    private pendingSync = false;

    get key() {
        return this.myKey;
    }

    get value() {
        return this.myValue;
    }

    get characterIds() {
        if (this.mycharacterIds && this.mycharacterIds.size > 0) {
            return [...this.mycharacterIds]
        } else {
            return undefined
        }
    }

    constructor(config: SimContextItem, private activated: boolean, private contextManager: ContextManager) {
        contextManager?.addItem(this)
        this.myKey = config.key;
        this.myValue = config.value;
        let shouldSync = true;
        if (!activated || config.value == '') {
            shouldSync = false;
        }
        if (config.characterIds && config.characterIds.length == 0) {
            shouldSync = false;
        } else if (config.characterIds) {
            this.disableSync();
            this.setcharacterIds(config.characterIds)
        }

        this.enableSync(true)
        this.syncContext();
    }

    public delete() {
        this.syncRemoveContext();
        this.contextManager?.removeItem(this);
    }

    public setValue(newValue: string) {
        if (this.value == newValue) return;
        this.myValue = newValue;
        if (this.myValue == '') {
            this.syncRemoveContext()
        } else {
            this.syncContext();
        }
    }

    public addRole(role: string): void {
        if (!this.mycharacterIds) {
            this.mycharacterIds = new Set<string>();
        }
        const sizeBefore = this.mycharacterIds.size;
        this.mycharacterIds.add(role);
        if (this.mycharacterIds.size !== sizeBefore) {
            this.syncContext();
        }
    }

    public setcharacterIds(characterIds: string[]) {
        if (
            characterIds.length === this.mycharacterIds?.size &&
            characterIds.every(role => this.mycharacterIds?.has(role))
        ) {
            return;
        }
        this.mycharacterIds = new Set(characterIds);
        if (this.mycharacterIds.size == 0) {
            this.syncRemoveContext();
        } else {
            this.syncContext();
        }
    }

    public removeRole(role: string): void {
        if (!this.mycharacterIds) {
            return;
        }
        const removed = this.mycharacterIds.delete(role);
        if (!removed) {
            return;
        }

        if (this.mycharacterIds.size > 0) {
            this.syncContext();
        } else {
            this.syncRemoveContext();
        }
    }

    public enableSync(dontCall = false) {
        this.isDisableSync = false;
        if (this.pendingSync && !dontCall) {
            this.syncContext();
        }
    }
    public disableSync() {
        this.isDisableSync = true;
    }

    private syncContext() {
        if (this.isDisableSync) {
            this.pendingSync = true;
            return;
        } else {
            this.pendingSync = false;
        }

        if (this.mycharacterIds && this.mycharacterIds.size == 0)
            return;

        if (this.myValue == '')
            return

        if (this.activated) {
            this.contextIsAdded = true;
            this.contextManager?.sync(this)
        }
    }

    private syncRemoveContext() {
        if (!this.contextIsAdded) {
            return;
        }
        this.contextManager?.syncRemove(this)
        this.contextIsAdded = false;
    }
}

