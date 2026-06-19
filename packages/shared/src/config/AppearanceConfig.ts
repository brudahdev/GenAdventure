export interface AppearanceClassConfig {
    class: string;
    subClasses?: AppearanceClassConfig[];
}

export interface AppearanceItemConfig {
    class?: string;
    id: string;
    img_txt?: string;
    img_txt_neg?: string;
    ctx_txt?: string;
    include_in_ctx?: boolean;
    ingnore_clothing_covering?: boolean;
}

export interface AppearanceEntryConfig {
    id: string;
    items?: AppearanceItemConfig[];
    overrides?: string[];
}

export interface AppearanceConfig {
    appearanceClasses: AppearanceClassConfig[];
    appearance: AppearanceEntryConfig[];
}