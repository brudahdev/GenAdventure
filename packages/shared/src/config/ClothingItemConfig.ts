import { Taggable } from "../Taggable";

export interface ClothingItemConfig extends Taggable {
    id: string;
    name: string;
    context: string;
    slot?: string;
    transParentIfWet?: boolean;
    sisterId?: string;
    isATop?: boolean;
    states: ClothingItemStateConfig[]
}

export interface ClothingItemStateConfig extends Taggable {
    id: string;
    state_context?: string;

    enteries?: ClothingItemStateEntryConfig[];
    transitions?: ClothingStateTransition[];

    occludesSubItems?: boolean;
    obstructsSubItems?: boolean;
    coversAppearanceClasses?: string[];//completely occluded by this item. Ie: gloves completely occludes fingernails. a shirt covers chest hair. Not if it is visible despite clothing: i.e. broad shoulders are sill visible with a t shirt on
}

export interface ClothingItemStateEntryConfig {
    img_txt?: string;
    img_txt_neg?: string;
    forAppearanceClass?: string; // this clothing item should only be visible if the appearance class is visible. Ie. if you cant see the chest you cant see a tie
}

export interface ClothingStateTransition extends Taggable {
    id: string;
}

