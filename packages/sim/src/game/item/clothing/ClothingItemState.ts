import { ClothingItemStateConfig, ClothingItemStateEntryConfig, Taggable } from "@gen-adventure/shared";
import { ClothingItem } from "./ClothingItem";
import { PromptBuilder } from "../../../core/PromptBuilder";

export class ClothingItemState implements Taggable {
    private entries: ClothingItemStateEntry[] = [];
    constructor(private clothingItem: ClothingItem, private config: ClothingItemStateConfig) {
        this.entries = config.enteries?.map(entryConfig => new ClothingItemStateEntry(clothingItem, entryConfig)) ?? [];
    }
    get id() {
        return this.config.id;
    }

    get tags() {
        return this.config.tags;
    }

    get excludeTags() {
        return this.config.excludeTags
    }

    get occludesSubItems() {
        return this.config.occludesSubItems
    }

    get obstructsSubItems() {
        return this.config.obstructsSubItems;
    }

    get coversAppearanceClasses() {
        return this.config.coversAppearanceClasses;
    }

    get transitions() {
        return this.config.transitions;
    }

    get verb() {
        return this.config.verb
    }

    getClothingItem() {
        return this.clothingItem;
    }

    getImagePrompt() {
        var prompt = new PromptBuilder(",");
        this.entries.forEach(entry => {
            // if (entry.getAppearanceItem() && entry.getAppearanceItem()?.getIsCoveredByPose()) {
            //     return;
            // }
            if (entry.img_txt)
                prompt.addToPos(entry.img_txt)
            if (entry.img_txt_neg)
                prompt.addToNeg(entry.img_txt_neg)
        });

        return prompt;
    }

    linkToAppearanceItems() {
        // this.enteries.forEach(entry => entry.linkToAppearanceItems())
    }

    appendImagePrompt(prompt: PromptBuilder) {
        var myPrompt = this.getImagePrompt();
        prompt.addToPos(myPrompt.getPositive());
        prompt.addToNeg(myPrompt.getNegative());
    }

    getClothingItemStateCtxTxt(): string | undefined {
        const stateInfo: string[] = [];
        if (this.config.state_context) {
            stateInfo.push(this.config.state_context);
        }
        // if (this.clothingItem.getIsWet()) {
        //     stateInfo.push('wet');
        // }
        // if (this.clothingItem.isWetAndTransparent()) {
        //     stateInfo.push('transparent');
        // }
        if (this.clothingItem.getIsOccluded()) {
            stateInfo.push('covered');
        }

        if (this.id == "off") {//todo remove off state
            return ''
        }

        return this.clothingItem.context + (stateInfo.length > 0 ? ` (${stateInfo.join(',')})` : '');
    }
}


export class ClothingItemStateEntry {
    private clothingItem: ClothingItem
    // private appearanceItem?: AppearanceItem dont touch this claude

    constructor(clothingItem: ClothingItem, private config: ClothingItemStateEntryConfig) {
        this.config = config;
        this.clothingItem = clothingItem;
    }

    get img_txt() {
        return this.config.img_txt;
    }

    get img_txt_neg() {
        return this.config.img_txt_neg;
    }

    get forAppearanceClass() {
        return this.config.forAppearanceClass;
    }

    // getAppearanceItem() {
    //     return this.appearanceItem;
    // }

    // linkToAppearanceItems() {
    //     if (this.forAppearanceClass) {
    //         var appearanceItems = this.clothingItem.getWearingCharacter()?.appearance.getAppearanceItems();
    //         if (!appearanceItems) return

    //         this.appearanceItem = appearanceItems.find(item => item.class == this.forAppearanceClass)
    //     }
    // }
}