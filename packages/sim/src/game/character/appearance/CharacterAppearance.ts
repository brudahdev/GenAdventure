import type { Entity } from "../../../core/ec/Entity";
import { EventSystem } from "../../EventSystem";
import { APPEARANCE_CONFIG_ADAPTER, type AppearanceConfigAdapter } from "./AppearanceConfigAdapter";
import { AppearanceItem } from "./AppearanceItem";
import { AppearanceItemConfig } from "@gen-adventure/shared";
import { PromptBuilder } from "../../../core/PromptBuilder";

import { AppearanceClassManager } from "./AppearanceClassManager";
import { ClothingItem } from "../../item/clothing/ClothingItem";
import { defineKey } from "../../../core/ec/ComponentKey";
import { defineFactory } from "../../../core/ec/ComponentFactory";
import { CharacterIdentity, CharacterIdentityKey } from "../identity/CharacterIdentity";
import { LocationContextItem } from "../../location/LocationContextItem";
import { LocationContextItemFactory } from "../../location/LocationContextItemFactory";
import { CharacterLocationKey } from "../location/CharacterLocation";
import { Component } from "../../../core/ec/Component";

export const AppearanceKey = defineKey<CharacterAppearance>("character.appearance")
export const appearanceFactory = defineFactory(AppearanceKey, (entity, c) =>
    new CharacterAppearance(
        entity,
        c.resolve<AppearanceConfigAdapter>(APPEARANCE_CONFIG_ADAPTER),
        c.resolve(EventSystem),
        c.resolve(LocationContextItemFactory),
    ))
export class CharacterAppearance implements Component {
    private charId: CharacterIdentity;
    private contextItem: LocationContextItem;


    private readonly appearanceItems: AppearanceItem[];
    public readonly classManager: AppearanceClassManager;
    private noun: string;

    constructor(
        entity: Entity,
        appearanceConfig: AppearanceConfigAdapter,
        eventSystem: EventSystem,
        contextItemFactory: LocationContextItemFactory,
    ) {
        this.charId = entity.require(CharacterIdentityKey)
        const entryIds = this.charId.config.appearanceEntryIds;//todo get this from adapter

        this.appearanceItems = parseItemsByEntryIds(entryIds, appearanceConfig)
        this.classManager = new AppearanceClassManager(entity, appearanceConfig, eventSystem)
        this.noun = this.appearanceItems.find(item => item.id == 'noun')?.img_txt ?? '';

        this.contextItem = contextItemFactory.create(
            {
                key: "appearance_" + entity.require(CharacterIdentityKey).name,
                value: '',
                characterIds: []
            },
            entity.require(CharacterLocationKey).getCharacterLocationObserver()
        );
    }

    lateInit() {
        this.updateContext()
    }

    getNoun() {
        return this.noun;
    }

    getAppearanceItems() {
        return this.appearanceItems;
    }

    buildAvatarImage(prompt: PromptBuilder) {
        for (const item of this.appearanceItems) {
            item.buildImagePrompt(prompt);
        }
    }

    onClothingCoverChangeForAppearanceClass(clazz: string, isCovered: boolean, clothingItem: ClothingItem) {
        const appearanceItemsUncovered: AppearanceItem[] = [];
        const appearanceItemsCovered: AppearanceItem[] = [];

        for (const appearanceItem of this.appearanceItems ?? []) {
            if (appearanceItem.class !== clazz) {
                continue;
            }

            // Capture previous state before updating
            const wasCovered = appearanceItem.getIsCoveredByClothing();

            appearanceItem.setIsCoveredByClothing(isCovered);

            // Previously covered -> now uncovered
            if (wasCovered && !isCovered) {
                appearanceItemsUncovered.push(appearanceItem);
            }

            // Previously uncovered -> now covered
            if (!wasCovered && isCovered) {
                appearanceItemsCovered.push(appearanceItem);
            }
        }

        // Handle newly visible items
        if (appearanceItemsUncovered.length > 0) {
            const prompt = new PromptBuilder(",");

            for (const appearanceItem of appearanceItemsUncovered) {
                if (appearanceItem.getIsCoveredByPose()) {
                    continue;
                }

                prompt.addToPos(appearanceItem.img_txt ?? "");
            }

            if (prompt.getPositive().length > 0) {
                const txt = prompt.getPositive().trim();
                // const notificationTxt =
                //     `${this.character.name}'s ${txt} ${StringUtils.isAreAdverb(txt)} now visible, no longer covered by ${this.character.hisHer} ${clothingItem.name}.`;

                // NotificationService.addTryPush(notificationTxt);
            }
        }

        // Handle newly covered items
        if (appearanceItemsCovered.length > 0) {
            const prompt = new PromptBuilder(",");

            for (const appearanceItem of appearanceItemsCovered) {
                if (appearanceItem.getIsCoveredByPose()) {
                    continue;
                }

                prompt.addToPos(appearanceItem.img_txt ?? "");
            }

            if (prompt.getPositive().length > 0) {
                const txt = prompt.getPositive().trim();
                // const notificationTxt =
                //     `${this.character.name}'s ${txt} ${StringUtils.isAreAdverb(txt)} now hidden, covered by ${this.character.hisHer} ${clothingItem.name}.`;

                // NotificationService.addTryPush(notificationTxt);
            }
        }
        this.updateContext();
    }

    public updateContext() {//todo private context
        const prompt = new PromptBuilder(',');

        for (const item of this.appearanceItems) {
            if (item.getIsCoveredByClothing() && item.ingnore_clothing_covering != true) {
                continue
            }
            if (item.include_in_ctx && !item.ctx_txt) {
                prompt.addToPos(item.img_txt)
            } else if (item.ctx_txt) {
                prompt.addToPos(item.ctx_txt)
            }
        }

        this.contextItem.setValue(`${this.charId.name}'s appearance:[${prompt.getPositive()}]`)
    }
}



export function parseItemsByEntryIds(entryIds: string[], configAdapter: AppearanceConfigAdapter): AppearanceItem[] {
    let appearanceItems: AppearanceItem[] = []

    for (const entryId of entryIds) {

        appearanceItems = mergeAppearanceItems(appearanceItems, parseItemsByEntryId(entryId, configAdapter))
    }
    return appearanceItems
}

export function mergeAppearanceItems(currentItems: AppearanceItem[], newItems: AppearanceItem[]): AppearanceItem[] {
    const merged = [...currentItems];

    for (const newItem of newItems) {
        const index = merged.findIndex(item => item.id === newItem.id);

        if (index !== -1) {
            // Replace existing item
            merged[index] = newItem;
        } else {
            // Add new item
            merged.push(newItem);
        }
    }

    return merged;
}

export function parseItemsByEntryId(entryId: string, configAdapter: AppearanceConfigAdapter): AppearanceItem[] {
    var rv: AppearanceItem[] = [];
    const appearanceConfig = configAdapter.getAppearanceEntryConfig(entryId)

    if (!appearanceConfig) {
        return rv
    }
    if (appearanceConfig.overrides) {
        rv = mergeAppearanceItems(rv, parseItemsByEntryIds(appearanceConfig.overrides, configAdapter))
    }

    return mergeAppearanceItems(rv, parseItemsByConfig(appearanceConfig.items ?? []))
}

export function parseItemsByConfig(groupConfigs: AppearanceItemConfig[]): AppearanceItem[] {
    var appearanceItems: AppearanceItem[] = []
    for (const groupConfig of groupConfigs) {

        // mergeAppearanceItems(appearanceItems, parseGroupsByEntryIds([]))

        var newItem = new AppearanceItem(groupConfig);
        appearanceItems.push(newItem);
    }

    return appearanceItems;
}



