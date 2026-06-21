import { ClothingItemConfig, Taggable } from "@gen-adventure/shared";
import { StateManager } from "../../../core/StateManager";
import { ClothingItemState } from "./ClothingItemState";
import type { Entity } from "../../../core/ec/Entity";
import { ClothingManagerKey } from "../../character/clothing/ClothingManager";
import { EventSystem } from "../../EventSystem";
import { PromptBuilder } from "../../../core/PromptBuilder";
import { StringUtils } from "../../../utils/StringUtils";
import { findFirstWithTag } from "../../../core/TagUtils";



export class ClothingItem implements Taggable {//todo transitions
    private subItems: ClothingItem[] = []
    private stateManager: StateManager<ClothingItemState> = new StateManager<ClothingItemState>();

    private isObstructed = false;
    private isOccluded = false;

    private wearingEntity: Entity | null = null;
    private isWet = false;

    private parent: ClothingItem | null = null

    constructor(
        private config: ClothingItemConfig,
        private eventSystem: EventSystem,
        startingStateId = 'on',
    ) {
        this.initStateManager(startingStateId);
    }

    get id() {
        return this.config.id;
    }

    get tags(): string[] {
        return this.config.tags
    }

    get excludeTags(): string[] | undefined {
        return this.config.excludeTags
    }

    get slot(): string | undefined {
        return this.config.slot
    }

    get name() {
        return this.config.name
    }

    get context() {
        return this.config.context
    }


    getSubItems() {
        return this.subItems;
    }

    getParent() {
        return this.parent;
    }

    setParent(parent: ClothingItem) {
        this.parent = parent;
    }

    setSubItems(subItems: ClothingItem[]) {
        subItems.forEach(subItem => subItem.setParent(this))
        this.subItems = subItems;
    }

    getIsObstructed() {
        return this.isObstructed;
    }

    getIsOccluded() {
        return this.isOccluded;
    }

    getWearingEntity() {
        return this.wearingEntity;
    }

    emitClothingChangedEvent() {
        if (this.wearingEntity) {
            this.eventSystem
                .emit("clothing.state.changed", { characterId: this.wearingEntity.id, clothingId: this.id });
        }
    }

    getStateIds(): string[] {
        return this.stateManager.getStateItems().map(state => state.id);
    }

    getCurrentStateId(): string {
        return this.stateManager.getCurrentStateId();
    }

    getInactiveStateIds() {
        return this.getStateIds().filter(stateId => this.stateManager.getCurrentStateId() != stateId)
    }

    setWearingEntity(wearingEntity: Entity, emitEvent = true) {
        this.wearingEntity = wearingEntity;
        this.stateManager.getStateItems()
            .forEach(clothingItemState => clothingItemState.linkToAppearanceItems())

        if (emitEvent) {
            this.emitClothingChangedEvent();
        }
    }

    setStateById(stateId: string) {
        return this.stateManager.setStateById(stateId);
    }



    getStateByTag(tag: string): ClothingItemState | undefined {
        return findFirstWithTag(tag, this.stateManager.getStateItems())
    }

    appendImagePrompt(prompt: PromptBuilder) {
        if (this.isOccluded) {
            return;
        }

        this.stateManager.getActiveState()?.appendImagePrompt(prompt);
    }

    appendContextPrompt(prompt: PromptBuilder) {
        var currentItemText = this.stateManager.getActiveState()?.getClothingItemStateCtxTxt();//this should be delegated to the clothing item
        if (currentItemText) {
            prompt.addToPos(currentItemText);
        }
    }

    updateOcclusions(occludedByParent: boolean, obstructedByParent: boolean): boolean {
        const prevOccluded = this.isOccluded;
        const prevObstructed = this.isObstructed;

        const isNowVisible = this.isOccluded && !occludedByParent;
        if (isNowVisible) {
            const clothingItemText = this.stateManager.getActiveState()?.getImagePrompt().getPositive() ?? "";
            const cleanedUpText = clothingItemText.replace(/,|[\s]+$/g, '');
            const adverb = StringUtils.isAreAdverb(cleanedUpText);

            // NotificationService.addTryPush(`${this.wearingCharacter?.name}'s ${clothingItemText} ${adverb} now visible.`);
        }
        const isCovered = !this.isOccluded && occludedByParent;
        if (isCovered) {
            const clothingItemText = this.stateManager.getActiveState()?.getImagePrompt().getPositive() ?? "";
            const cleanedUpText = clothingItemText.replace(/,|[\s]+$/g, '');
            const adverb = StringUtils.isAreAdverb(cleanedUpText);

            // NotificationService.addTryPush(`${this.wearingCharacter?.name}'s ${clothingItemText} ${adverb} now covered.`);
        }

        this.isOccluded = occludedByParent;
        this.isObstructed = obstructedByParent;

        let changed = (prevOccluded !== this.isOccluded) || (prevObstructed !== this.isObstructed);

        const currentState = this.stateManager.getActiveState();
        for (const subItem of this.subItems) {
            const subItemOccluded =
                this.isOccluded ||
                ((currentState?.occludesSubItems ?? false) && !(this.isWet && this.config.transParentIfWet));

            const subItemObstructed =
                this.isObstructed || (currentState?.obstructsSubItems ?? false);

            const childChanged = subItem.updateOcclusions(subItemOccluded, subItemObstructed);
            if (childChanged) changed = true;
        }

        return changed;
    }

    isTopOrSubItemIsTop(): boolean {//todo remove isAtop
        if (this.config.isATop && this.stateManager.getActiveState()?.id != 'off') {
            return true;
        }
        for (const subItem of this.subItems) {
            if (subItem.isTopOrSubItemIsTop()) {
                return true;
            }
        }
        return false;
    }

    

    private initStateManager(startingStateId: string) {
        this.stateManager.onStateChange(this.onStateChange.bind(this));

        for (const stateConfig of this.config.states) {
            const newState = new ClothingItemState(this, stateConfig);
            this.stateManager.addStateItem(newState);
        }

        // Prefer the requested (possibly saved) state; fall back to 'on' if a
        // saved state id no longer exists in config (content drift tolerance).
        const success = this.stateManager.setStateById(startingStateId)
            || (startingStateId !== 'on' && this.stateManager.setStateById('on'));
        if (!success) {
            throw new Error(`Unable to init clothing item state to '${startingStateId}' or 'on'!`);
        }
    }

    private onStateChange(newState: ClothingItemState, oldState: ClothingItemState | null): void {
        this.updateOcclusions(this.isOccluded, this.isObstructed);

        //remove sister item if there is one
        if (newState.id == 'off' && this.config.sisterId != null) {
            const sisterItem = this.wearingEntity?.require(ClothingManagerKey).getClothingItemById(this.config.sisterId);
            if (sisterItem && sisterItem.stateManager.getActiveState()?.id != 'off') {
                sisterItem.stateManager.setStateById("off")
            }
        }
        this.emitClothingChangedEvent();
        this.wearingEntity?.require(ClothingManagerKey).onClothingItemStateChange()
    }


}