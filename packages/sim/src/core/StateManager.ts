import { IDable, Taggable } from "@gen-adventure/shared";
import { findById, findFirstWithTag } from "./TagUtils";

export class StateManager<T extends IStateItem<T>> {//todo transitions
    private stateItems: T[] = [];
    private activeStateItem: T | null = null;
    private stateChangeCallback?: (newState: T, oldState: T | null) => void;

    addStateItem(stateItem: T): void {
        this.stateItems.push(stateItem);
    }

    setStateByTag(tag: string): boolean {
        const newState = findFirstWithTag(tag, this.stateItems);
        return this.setStateByState(newState);
    }

    getStateWithTag(tag: string): T | undefined {
        const newState = findFirstWithTag(tag, this.stateItems);
        return newState;
    }

    getStateById(id: string): T | undefined {
        return this.stateItems.find(item => item.id == id)
    }

    setStateById(id: string): boolean {
        const newState = findById(id, this.stateItems);
        return this.setStateByState(newState);
    }

    getActiveState(): T | null {
        return this.activeStateItem;
    }

    getCurrentStateId(): string {
        return this.activeStateItem?.id ?? '';
    }

    onStateChange(callback: (newState: T, oldState: T | null) => void): void {
        this.stateChangeCallback = callback;
    }

    getStateItems(): T[] {
        return this.stateItems;
    }

    setStateByState(newState: T | undefined): boolean {
        if (!newState || newState === this.activeStateItem) {
            return false;
        }

        const oldState = this.activeStateItem;

        oldState?.onExitState?.(newState);
        newState.onEnterState?.(oldState);

        this.activeStateItem = newState;

        this.stateChangeCallback?.(newState, oldState);

        return true;
    }
}
export interface IStateItem<T> extends IDable, Taggable {
    onExitState?(nextState: T | null): void;
    onEnterState?(lastState: T | null): void;
}