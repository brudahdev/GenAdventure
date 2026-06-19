import type { Component } from "../../../core/ec/Component";
import type { Entity } from "../../../core/ec/Entity";
import type { Saveable } from "../../../core/save/Saveable";
import { RESTORE_SOURCE, RestoreSource } from "../../../core/save/RestoreSource";
import { EventSystem } from "../../EventSystem";
import { POSE_CONFIG_ADAPTER, type PoseConfigAdapter } from "./PoseConfigAdapter";
import { STARTING_STATE_ADAPTER, type StartingStateAdapter } from "../StartingStateAdapter";
import { Pose } from "./Pose";
import { defineKey } from "../../../core/ec/ComponentKey";
import { defineFactory } from "../../../core/ec/ComponentFactory";
import { PromptBuilder } from "../../../core/PromptBuilder";
import { AppearanceKey } from "../appearance/CharacterAppearance";
import { CharacterLocation, CharacterLocationKey } from "../location/CharacterLocation";
import { LocationContextItem } from "../../location/LocationContextItem";
import { LocationContextItemFactory } from "../../location/LocationContextItemFactory";
import { CharacterIdentityKey } from "../identity/CharacterIdentity";

export const CharacterPoseKey = defineKey<CharacterPose>("character.pose")

/** {@link CharacterPose}'s save blob: the current pose id. */
interface PoseSave { poseId: string }

export class CharacterPose implements Component, Saveable<PoseSave> {
    private poseMap = new Map<string, Pose>();
    private currentPose: Pose;

    private contextItem: LocationContextItem;
    private characterName: string;
    private characterLocation: CharacterLocation

    constructor(
        private readonly entity: Entity,
        private readonly eventSystem: EventSystem,
        poseConfigAdapter: PoseConfigAdapter,
        restore: RestoreSource,
        startingState: StartingStateAdapter,
        contextItemFactory: LocationContextItemFactory,
    ) {
        this.characterName = entity.require(CharacterIdentityKey).name
        this.characterLocation = entity.require(CharacterLocationKey)

        for (const poseConfig of poseConfigAdapter.getConfigs()) {
            const pose = new Pose(poseConfig);
            this.poseMap.set(poseConfig.id, pose);
        }

        const defaultPoseId = () => startingState.getRoleConfig(entity.id).startingPoseId
        const saved = restore.forEntity<PoseSave>(entity.id, CharacterPoseKey.id, () => ({ poseId: defaultPoseId() }))

        // Fall back to the role's default pose if the saved one no longer exists.
        let initPose = this.poseMap.get(saved.poseId);
        if (!initPose) {
            if (restore.isResume) {
                console.warn(`[sim] saved pose '${saved.poseId}' for ${entity.id} no longer exists; using role default`)
            }
            initPose = this.poseMap.get(defaultPoseId());
        }
        if (!initPose) {
            throw Error("Unable to find init pose " + saved.poseId)
        }

        this.contextItem = contextItemFactory.create(
            {
                key: "pose_" + this.characterName,
                value: '',
                characterIds: []
            },
            this.characterLocation.getCharacterLocationObserver()
        );

        this.currentPose = initPose;
        this.updatePoseContextItem();
    }

    /** Emits the initial `pose.changed`. */
    init(): void {
        this.emitPoseChangedEvent()
    }

    save(): PoseSave {
        return { poseId: this.currentPose.id }
    }

    buildAvatarImage(prompt: PromptBuilder) {

        const noun = this.entity.require(AppearanceKey).getNoun();
        const locationPrompt = this.characterLocation.getCurrentSubLocation().getPoseImagePrompt(this.currentPose.id);
        prompt.addToPos(`${noun} ${locationPrompt.getPositive()}`)
        prompt.addToNeg(locationPrompt.getNegative())
    }

    getCurrentPoseId(): string { return this.currentPose.id }

    setPoseById(poseId: string) {
        //todo validation here? command layer? task GOAP?
        const targetPose = this.poseMap.get(poseId)
        if (!targetPose) {
            return;
        }
        this.setPose(targetPose)
    }

    setPose(pose: Pose) {
        //todo validation here? command layer? task GOAP?

        if (pose === this.currentPose) {
            return;
        }

        this.currentPose = pose;

        this.updatePoseContextItem();
        this.emitPoseChangedEvent();
    }

    getAvailablePoseOptions(): string[] {
        const options: string[] = []
        const locPoseOptions = this.characterLocation.getCurrentSubLocation().getPoseOptions();
        for (const option of locPoseOptions) {
            if (option == this.currentPose.id) {
                continue;
            }
            options.push(option)
        }
        return options;
    }

    getPoseById(poseId: string) {
        return this.poseMap.get(poseId) ?? null;
    }

    getLocationPoseContextPrompt() {
        // return this.character.fillTemplate() //todo
        return this.characterLocation.getCurrentSubLocation().getPoseContextPromptById(this.currentPose.id);
    }

    private emitPoseChangedEvent() {
        this.eventSystem.emit("pose.changed", {
            characterId: this.entity.id,
            poseId: this.currentPose.id
        })
    }

    private updatePoseContextItem() {
        this.contextItem.setValue(`${this.characterName} is ${this.getLocationPoseContextPrompt()}.`)
    }


}

export const characterPoseFactory = defineFactory(CharacterPoseKey, (entity, c) =>
    new CharacterPose(
        entity,
        c.resolve(EventSystem),
        c.resolve<PoseConfigAdapter>(POSE_CONFIG_ADAPTER),
        c.resolve<RestoreSource>(RESTORE_SOURCE),
        c.resolve<StartingStateAdapter>(STARTING_STATE_ADAPTER),
        c.resolve(LocationContextItemFactory),
    ))

