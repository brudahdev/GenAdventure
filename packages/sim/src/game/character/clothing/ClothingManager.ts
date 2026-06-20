import { OutfitSlotConfig, PLAYER_CHARACTER_ID, type ClothingStateChangeOptionsSummary } from "@gen-adventure/shared";
import type { Component } from "../../../core/ec/Component";
import type { Entity } from "../../../core/ec/Entity";
import type { Saveable } from "../../../core/save/Saveable";
import { RESTORE_SOURCE, RestoreSource } from "../../../core/save/RestoreSource";
import { EventSystem } from "../../EventSystem";
import { ClothingItem } from "../../item/clothing/ClothingItem";
import { STARTING_CLOTHING_ADAPTER, type StartingClothingAdapter } from "./StartingClothingAdapter";
import { CLOTHING_ITEM_CONFIG_ADAPTER, type ClothingItemConfigAdapter } from "../../item/clothing/ClothingItemConfigAdapter";
import { OUTFIT_CONFIG_ADAPTER, type OutfitConfigAdapter } from "../../item/clothing/OutfitConfigAdapter";
import { PromptBuilder } from "../../../core/PromptBuilder";
import { defineKey } from "../../../core/ec/ComponentKey";
import { defineFactory } from "../../../core/ec/ComponentFactory";
import { CharacterIdentity, CharacterIdentityKey } from "../identity/CharacterIdentity";
import { LocationContextItem } from "../../location/LocationContextItem";
import { LocationContextItemFactory } from "../../location/LocationContextItemFactory";
import { CharacterLocationKey } from "../location/CharacterLocation";
import { ClothingInferenceAction } from "./ClothingInferenceAction";
import { InferenceActionManager } from "../../../core/action-inference/InferenceActionManager";
import { findFirstWithTag } from "../../../core/TagUtils";


export const ClothingManagerKey = defineKey<ClothingManager>("character.clothing")

/** One worn item's persisted state: its id plus which state (`on`/`off`/…) it's
 *  in — the per-item state the old flat save dropped. */
interface ClothingItemSave { id: string; stateId: string }
/** {@link ClothingManager}'s save blob and the shape its default closure builds. */
interface ClothingSave { items: ClothingItemSave[] }


export const clothingFactory = defineFactory(ClothingManagerKey, (entity, c) =>
    new ClothingManager(
        entity,
        c.resolve(EventSystem),
        c.resolve<RestoreSource>(RESTORE_SOURCE),
        c.resolve<StartingClothingAdapter>(STARTING_CLOTHING_ADAPTER),
        c.resolve<ClothingItemConfigAdapter>(CLOTHING_ITEM_CONFIG_ADAPTER),
        c.resolve<OutfitConfigAdapter>(OUTFIT_CONFIG_ADAPTER),
        c.resolve(LocationContextItemFactory),
        c.resolve(InferenceActionManager)
    ))


export class ClothingManager implements Component, Saveable<ClothingSave> {
    private slotMap = new Map<string, ClothingItem[]>();
    private clothingItems: ClothingItem[] = [];


    private contextItem: LocationContextItem;
    private inferenceAction?: ClothingInferenceAction;

    constructor(
        private readonly entity: Entity,
        eventSystem: EventSystem,
        restore: RestoreSource,
        startingClothing: StartingClothingAdapter,
        clothingItemConfig: ClothingItemConfigAdapter,
        private readonly outfitConfig: OutfitConfigAdapter,
        contextItemFactory: LocationContextItemFactory,
        inferenceManager: InferenceActionManager,
    ) {
        // Saved per-item id+state on resume; outfit ids in their default 'on'
        // state on a fresh start.
        const saved = restore.forEntity<ClothingSave>(entity.id, ClothingManagerKey.id, () => ({
            items: startingClothing.getClothingItemIds(entity.id).map(id => ({ id, stateId: 'on' })),
        }))
        const initItems: ClothingItem[] = []
        for (const { id, stateId } of saved.items) {
            try {
                initItems.push(new ClothingItem(clothingItemConfig.getClothingItemConfig(id), eventSystem, stateId))
            } catch (e) {
                // Content drift: a saved item id no longer exists — skip it rather
                // than failing the whole load.
                console.warn(`[sim] dropping unknown clothing item '${id}' for ${entity.id}: ${e instanceof Error ? e.message : e}`)
            }
        }
        this.setClothingItems(initItems);

        this.contextItem = contextItemFactory.create(
            {
                key: "clothing_" + entity.require(CharacterIdentityKey).name,
                value: '',
                characterIds: []
            },
            entity.require(CharacterLocationKey).getCharacterLocationObserver()
        );

        this.updateContext()

        if (entity.id != PLAYER_CHARACTER_ID) {
            this.inferenceAction = new ClothingInferenceAction(this.entity, eventSystem, inferenceManager);
        }
    }

    /** Emits each item's initial `clothing.state.changed`. */
    init(): void {
        this.clothingItems.forEach(clothingItem => clothingItem.emitClothingChangedEvent())
    }

    save(): ClothingSave {
        return { items: this.clothingItems.map(item => ({ id: item.id, stateId: item.getCurrentStateId() })) }
    }

    getClothingItemById(id: string) {
        return this.clothingItems.find(clothingItem => clothingItem.id == id)
    }

    getClothingItemByTag(tag: string): ClothingItem | undefined {
        return findFirstWithTag(tag, this.clothingItems)
    }

    getClothingItemIds(): string[] {
        return this.clothingItems.map(item => item.id)
    }

    setClothingItems(clothingItems: ClothingItem[], emitEvent = false) {
        this.clothingItems = clothingItems;
        clothingItems.forEach(clothingItem => clothingItem.setWearingEntity(this.entity, emitEvent))
        this.linkItems();
    }

    public getClothingStateChangeOptionsSummary(): ClothingStateChangeOptionsSummary[] {
        const rv: ClothingStateChangeOptionsSummary[] = [];
        for (const clothingItem of this.clothingItems) {
            const newOption = {
                clothingItemId: clothingItem.id,
                stateIds: clothingItem.getInactiveStateIds()
            }
            rv.push(newOption)
        }

        return rv;
    }

    public buildAvatarImage(prompt: PromptBuilder) {
        if (this.clothingItems.length == 0) {
            prompt.addToPos('nude');
            return;
        }

        let foundTop = false;
        this.clothingItems.forEach(clothingItem => {
            clothingItem.appendImagePrompt(prompt);
            if (!foundTop) {
                foundTop = clothingItem.isTopOrSubItemIsTop();
            }
        })

        if (!foundTop) {
            prompt.addToPos('topless');
        }
    }

    public updateContext() {
        const prompt = new PromptBuilder(',');
        this.clothingItems.forEach(clothingItem => clothingItem.appendContextPrompt(prompt))
        if (prompt.getPositive().length == 0) {
            this.contextItem.setValue(`${this.entity.require(CharacterIdentityKey).name} is completely naked.`)
            return;
        }

        this.contextItem.setValue(`${this.entity.require(CharacterIdentityKey).name}'s clothing:[${prompt.getPositive()}]`)
    }

    private buildSlotMap() {
        this.slotMap = new Map<string, ClothingItem[]>();

        for (const item of this.clothingItems) {
            const slot = item.slot;
            if (!slot) continue;

            const group = this.slotMap.get(slot) ?? [];
            group.push(item);

            this.slotMap.set(slot, group);
        }
    }

    private buildParentMap(
        config: OutfitSlotConfig[],
        parent?: string,
        map = new Map<string, string>()
    ): Map<string, string> {
        for (const node of config) {
            if (parent) {
                map.set(node.id, parent);
            }

            if (node.subItems) {
                this.buildParentMap(node.subItems, node.id, map);
            }
        }

        return map;
    }

    private linkItems() {//sets clothing sub items based on the outfit slot
        this.buildSlotMap();

        // childSlot -> closest parentSlot
        const parentMap = this.buildParentMap(this.outfitConfig.getSlotConfig());

        // Link every item to nearest parent
        for (const item of this.clothingItems) {
            const slot = item.slot;
            if (!slot) continue;

            const parentSlot = parentMap.get(slot);
            if (!parentSlot) continue;

            const parentItems = this.slotMap.get(parentSlot);
            if (!parentItems?.length) continue;

            // all items belonging to this slot
            const childItems = this.slotMap.get(slot) ?? [];

            // attach to every matching parent item
            for (const parentItem of parentItems) {
                parentItem.setSubItems(childItems);
            }
        }
        const rootItems = this.clothingItems.filter(clothingItem => clothingItem.getParent() == null)
        rootItems.forEach(rootItem => rootItem.updateOcclusions(false, false));
    }
}