import { AppearanceClassConfig } from "@gen-adventure/shared";
import type { Entity } from "../../../core/ec/Entity";
import { EventSystem } from "../../EventSystem";
import type { AppearanceConfigAdapter } from "./AppearanceConfigAdapter";
import { ClothingManagerKey } from "../clothing/ClothingManager";
import { AppearanceKey } from "./CharacterAppearance";
import { CharacterPoseKey } from "../pose/CharacterPose";
import { GameEvents } from "../../GameEvents";
import { ClothingItem } from "../../item/clothing/ClothingItem";


/*
    manages appearance item class covering by pose, clothing, and interactions
*/
export class AppearanceClassManager {
    private subClassMap: AppearanceClassMap;
    private superClassMap: AppearanceClassMap;
    private occludingClothingItemAppearanceClassMap = new Map<string, Set<ClothingItem>>();
    private clothingItemToCoveredClasses = new Map<ClothingItem, Set<string>>();
    private poseCoveredClasses = new Set<string>();

    constructor(private entity: Entity, appearanceConfig: AppearanceConfigAdapter, eventSystem: EventSystem) {
        this.subClassMap = buildSubClassMap(appearanceConfig.getAppearanceClassConfig());
        this.superClassMap = buildSuperClassMap(appearanceConfig.getAppearanceClassConfig());
        eventSystem.on('clothing.state.changed', (args) => {
            if (args.characterId == this.entity.id)
                this.onClothingItemChangeEvent(args)
        })

        eventSystem.on('pose.changed', (args) => {
            if (args.characterId == this.entity.id)
                this.onPoseChangedEvent(args)
        })
    }

    isClassCoveredByPose(clazz: string) {
        return this.poseCoveredClasses.has(clazz)
    }

    classIsCoveredByClothing(clazz: string) {//todo make private
        const set = this.occludingClothingItemAppearanceClassMap.get(clazz);
        return (set?.size ?? 0) > 0;
    }

    private onClothingItemChangeEvent(event: GameEvents["clothing.state.changed"]) {
        const clothingItem = this.entity.require(ClothingManagerKey).getClothingItemById(event.clothingId);
        if (!clothingItem) {
            return
        }
        const state = clothingItem.stateManager.getActiveState();

        const newCoveredClasses = new Set<string>();
        for (const clazz of state?.coversAppearanceClasses ?? []) {
            newCoveredClasses.add(clazz);
            this.getSubClassesForClass(clazz).forEach(subClass => newCoveredClasses.add(subClass));
        }

        const previousCoveredClasses = this.clothingItemToCoveredClasses.get(clothingItem) ?? new Set<string>();

        // --- REMOVALS ---
        for (const clazz of previousCoveredClasses) {
            if (!newCoveredClasses.has(clazz)) {
                const set = this.occludingClothingItemAppearanceClassMap.get(clazz);
                if (!set) continue;

                set.delete(clothingItem);

                if (set.size === 0) {
                    this.occludingClothingItemAppearanceClassMap.delete(clazz);
                    this.onClassUncovered(clazz, clothingItem); // only fire when it becomes fully uncovered
                }
            }
        }

        // --- ADDITIONS ---
        for (const clazz of newCoveredClasses) {
            if (!previousCoveredClasses.has(clazz)) {
                let set = this.occludingClothingItemAppearanceClassMap.get(clazz);

                const wasEmpty = !set || set.size === 0;

                if (!set) {
                    set = new Set<ClothingItem>();
                    this.occludingClothingItemAppearanceClassMap.set(clazz, set);
                }

                set.add(clothingItem);

                if (wasEmpty) {
                    this.onClassCovered(clazz, clothingItem); // only fire when it becomes covered from empty
                }
            }
        }

        this.clothingItemToCoveredClasses.set(clothingItem, newCoveredClasses);
    }
    private onPoseChangedEvent(event: GameEvents["pose.changed"]) {
        const pose = this.entity.require(CharacterPoseKey).getPoseById(event.poseId)
        if (!pose)
            return;
        //todo uncover existing
        this.poseCoveredClasses = new Set<string>();
        pose.occludedAppearanceClasses?.forEach(appearanceClass => this.poseCoveredClasses.add(appearanceClass));
        for (const occlude of [...this.poseCoveredClasses]) {
            this.getSubClassesForClass(occlude)
                .forEach(sub => this.poseCoveredClasses.add(sub))
        }

        this.entity.require(AppearanceKey)
            .getAppearanceItems()
            .filter(item => item.class)
            .forEach(item => {
                item.setIsCoveredByPose(this.poseCoveredClasses.has(item.class!));
            });

    }

    private classUncoveredCallbacks: Map<string, (() => void)[]> = new Map();
    addAppearanceClassUncoveredCallback(
        className: string,
        callback: () => void
    ): void {
        if (!this.classUncoveredCallbacks.has(className)) {
            this.classUncoveredCallbacks.set(className, []);
        }

        this.classUncoveredCallbacks.get(className)!.push(callback);
    }

    private onClassUncovered(clazz: string, clothingItem: ClothingItem) {
        this.entity.require(AppearanceKey).onClothingCoverChangeForAppearanceClass(clazz, false, clothingItem);

        const callbacks = this.classUncoveredCallbacks.get(clazz)
        if (!callbacks) {
            return;
        }
        for (const callback of callbacks) {
            callback();
        }
    }

    private onClassCovered(clazz: string, clothingItem: ClothingItem) {
        this.entity.require(AppearanceKey).onClothingCoverChangeForAppearanceClass(clazz, true, clothingItem);

    }

    getSubClassesForClass(className: string): string[] {
        return this.subClassMap.get(className) ?? []
    }

    getSubSuperClassesForClass(className: string): string[] {
        return this.superClassMap.get(className) ?? []
    }
}


type AppearanceClassMap = Map<string, string[]>;

function buildSubClassMap(
    configs: AppearanceClassConfig[]
): AppearanceClassMap {
    const map: AppearanceClassMap = new Map();
    const memo: Map<string, string[]> = new Map();

    function getDescendants(node: AppearanceClassConfig): string[] {
        if (memo.has(node.class)) {
            return memo.get(node.class)!;
        }

        let result: string[] = [];

        if (node.subClasses) {
            for (const sub of node.subClasses) {
                result.push(sub.class);
                result = result.concat(getDescendants(sub));
            }
        }

        memo.set(node.class, result);
        return result;
    }

    function traverse(node: AppearanceClassConfig) {
        const descendants = getDescendants(node);
        map.set(node.class, descendants);

        if (node.subClasses) {
            for (const sub of node.subClasses) {
                traverse(sub);
            }
        }
    }

    for (const config of configs) {
        traverse(config);
    }

    return map;
}

function buildSuperClassMap(
    configs: AppearanceClassConfig[]
): AppearanceClassMap {
    const map: AppearanceClassMap = new Map();

    function traverse(
        node: AppearanceClassConfig,
        ancestors: string[] = []
    ) {
        // Map this class to all its ancestors
        map.set(node.class, [...ancestors]);

        if (node.subClasses) {
            for (const sub of node.subClasses) {
                traverse(sub, [...ancestors, node.class]);
            }
        }
    }

    for (const config of configs) {
        traverse(config);
    }

    return map;
}
