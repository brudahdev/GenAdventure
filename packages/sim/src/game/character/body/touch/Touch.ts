
import { TouchInteractionArgs } from "./TouchManager";

import { TouchInteractionSlot } from "./TouchSlot";
import { TouchCallbackArgs, TouchConfig, TouchStopArgs } from "./config/TouchConfigs";
import { PromptBuilder } from "../../../../core/PromptBuilder";

import { Entity } from "../../../../core/ec/Entity";
import { EntityRegistry } from "../../../entity/EntityRegistry";
import { StringUtils } from "../../../../utils/StringUtils";
import { DuoTouchInteraction } from "./TouchDuo";
import { AppearanceKey, CharacterAppearance } from "../../appearance/CharacterAppearance";
import { CharacterIdentity, CharacterIdentityKey } from "../../identity/CharacterIdentity";
import { CharacterLocation, CharacterLocationKey } from "../../location/CharacterLocation";
import { Notif, PLAYER_CHARACTER_ID } from "@gen-adventure/shared";
import { NotificationService } from "../../../../core/NotificationService";
import { LocationContextItem } from "../../../location/LocationContextItem";
import { LocationContextItemFactory } from "../../../location/LocationContextItemFactory";
import { StopTouchInferenceAction } from "./StopTouchInferenceAction";
import { InferenceActionManager } from "../../../../core/action-inference/InferenceActionManager";

export class TouchInteraction {
    private actorInteractionSlot: TouchInteractionSlot | null = null;
    private targetInteractionSlot: TouchInteractionSlot | null = null;
    private actorStopAction: StopTouchInferenceAction | null = null;

    private contextItem?: LocationContextItem;

    protected characterAppearance: CharacterAppearance
    protected charLoc: CharacterLocation;
    constructor(
        public args: TouchInteractionArgs,
        protected entity: Entity,//Entitiy this instance lives on
        protected interactionData: TouchConfig,
        protected registry: EntityRegistry,
        private notificationService: NotificationService,
        private contextItemFactory: LocationContextItemFactory,
        private inferenceActionManager: InferenceActionManager,
    ) {
        this.characterAppearance = entity.require(AppearanceKey)
        this.charLoc = entity.require(CharacterLocationKey)
    }

    getEntity() {
        return this.entity;
    }

    /** Resolves the id-based touch args into the actor/target {@link Entity}s the
     *  config callbacks operate on. */
    protected buildCallbackArgs(): TouchCallbackArgs {
        return {
            args: this.args,
            actor: this.registry.requireById(this.args.actorId),
            target: this.registry.requireById(this.args.targetId),
        }
    }

    getInteractionData() {
        return this.interactionData;
    }
    getTouchArgs() {
        return this.args;
    }
    getActorInteractionSlot() {
        return this.actorInteractionSlot;
    }
    setActorInteractionSlot(slot: TouchInteractionSlot) {
        this.actorInteractionSlot = slot;
    }
    getTargetInteractionSlot() {
        return this.targetInteractionSlot;
    }
    setTargetInteractionSlot(slot: TouchInteractionSlot) {
        this.targetInteractionSlot = slot;
    }
    getActorStopAction() {
        return this.actorStopAction;
    }

    equals(other: TouchInteraction): boolean {
        const thisData = this.getInteractionData();
        const otherData = other.getInteractionData();
        const idMatches = thisData.id === otherData.id;
        const actorMatches = this.args.actorId === other.getTouchArgs().actorId;
        const targetMatches = this.args.targetId === other.getTouchArgs().targetId;
        return idMatches && actorMatches && targetMatches;
    }

    activate() {
        const startNote = this.interactionData.actorCharEffects?.onStartNote;
        if (startNote) {
            this.noteHelper(startNote)
        }
        this.interactionData.onActivate?.(this.buildCallbackArgs());
        this.activateContext();
        this.tryInitStopAction();
    }



    deActivate(sisterAlreadyDeactivated = false) {
        if (!sisterAlreadyDeactivated) {
            this.sendStopNote();
            this.interactionData.onDeactivate?.(this.buildCallbackArgs());
        }

        if (!(this instanceof DuoTouchInteraction)) {
            this.getActorInteractionSlot()?.removeInteraction(this, false);
            this.getTargetInteractionSlot()?.removeInteraction(this, false);
        }


        this.actorStopAction?.removeAction();
        this.actorStopAction = null;
        // this.character.touch.getPersister().touchDeactivated(this.args)

        this.deactivateContext();
    }

    appendImagePrompt(PromptBuilder: PromptBuilder) {
        const img_txt = this.interactionData.actorCharEffects?.img_txt;

        if (this.interactionData.actorCharEffects?.appearanceClass
            && this.characterAppearance.classManager.isClassCoveredByPose(this.interactionData.actorCharEffects.appearanceClass)) {
            return;
        }
        if (img_txt) {
            PromptBuilder.addToPos(this.getImgTxt(img_txt));
        }
    }

    isCompatibleWith(other: TouchInteraction, checkOtherDirection = true): boolean {
        const thisData = this.getInteractionData();// this is the new one.
        const otherData = other.getInteractionData();

        const thisIsActor = this.charIsActor();
        const thisIsTarget = !thisIsActor;
        const otherIsActor = (other instanceof DuoTouchInteraction) ? other.charIsActor() : true;
        const otherIsTarget = !otherIsActor;

        if (otherIsTarget && thisData.compatibleWith?.targetSlotContains) {
            const compatibleIds = thisData.compatibleWith.targetSlotContains;
            const otherIsCompatible = compatibleIds.includes(otherData.id);
            if (otherIsCompatible) return true;
        }
        if (!checkOtherDirection) {
            return false;
        }

        return other.isCompatibleWith(this, false);
    }

    shouldNotApply(other: TouchInteraction, checkOtherDirection = true): boolean {
        const thisData = this.getInteractionData();// this is the new one, first time around
        const otherData = other.getInteractionData();

        const thisIsActor = this.charIsActor();
        const thisIsTarget = !thisIsActor;
        const otherIsActor = (other instanceof DuoTouchInteraction) ? other.charIsActor() : true;
        const otherIsTarget = !otherIsActor;

        if (otherIsTarget && thisData.dontApplyIf?.targetSlotContains) { //fuck me this shit is too complicated
            const dontApplyIds = thisData.dontApplyIf.targetSlotContains;
            const dontApplyMatches = dontApplyIds.includes(otherData.id);
            if (dontApplyMatches) return true;
        }
        return false;
    }

    protected tryInitStopAction() {
        if (this.charIsTarget() && this instanceof DuoTouchInteraction) {
            return;
        }
        const stopActionDetails = this.interactionData.actorCharEffects?.stopAction;
        if (!stopActionDetails) {
            return;
        }

        this.actorStopAction = this.newStopAction(this.entity, stopActionDetails);
    }

    protected newStopAction(entity: Entity, stopArgs: TouchStopArgs): StopTouchInferenceAction | null {
        if (entity.id == PLAYER_CHARACTER_ID) {
            return null
        }

        const templateValues = this.getTemplateValues();
        const newAction = new StopTouchInferenceAction(
            entity,
            this.inferenceActionManager,
            this,
            {
                name: StringUtils.fillTemplate(stopArgs.name, templateValues),
                description: StringUtils.fillTemplate(stopArgs.description, templateValues),
            }

        );

        newAction.init();

        return newAction;
    }

    protected charIsActor() {
        return this.entity.id === this.args.actorId;
    }

    protected charIsTarget() {
        return this.entity.id === this.args.targetId;
    }

    protected activateContext() {
        if (this.interactionData.ctx_txt) {

            this.contextItem = this.contextItemFactory.create(
                {
                    key: this.getContextKey(),
                    value: StringUtils.fillTemplate(this.interactionData.ctx_txt, this.getTemplateValues()),
                    characterIds: []
                },
                this.entity.require(CharacterLocationKey).getCharacterLocationObserver()
            );
        }
    }

    protected getContextKey() {
        //todo override in duo ? may not be needed
        return `${this.interactionData.id}_${this.entity.require(CharacterIdentityKey).name}`;
    }

    protected deactivateContext() {
        this.contextItem?.delete();
        this.contextItem = undefined;
    }

    protected getTemplateValues(): Record<string, string> {
        const templates: Record<string, string> = {};

        templates['actor_name'] = this.registry.requireById(this.args.actorId).require(CharacterIdentityKey).name;
        templates['actor_hisHer'] = this.registry.requireById(this.args.actorId).require(CharacterIdentityKey).config.pronouns.hisHer;

        return templates;
    }

    protected getImgTxt(img_txt: string | string[]): string {
        if (Array.isArray(img_txt)) {
            return img_txt[Math.floor(Math.random() * img_txt.length)];
        }
        return img_txt;
    }

    protected sendStopNote() {
        const stopNote = this.interactionData.actorCharEffects?.onStopNote;
        if (stopNote) {
            this.noteHelper(stopNote);
        }
    }

    protected noteHelper(note: string) {
        const txt = StringUtils.fillTemplate(note, this.getTemplateValues());
        console.log(txt)
        const witnesses = this.charLoc.getCurrentLocation().getCharactersInLocation().map(ent => ent.id)
        const notif: Notif = { text: txt, characterIds: witnesses }
        this.notificationService.send(notif)
    }
}