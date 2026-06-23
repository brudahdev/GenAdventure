
import { TouchInteractionArgs } from "./TouchManager";

import { TouchInteractionSlot } from "./TouchSlot";
import { TouchCallbackArgs, TouchConfig, TouchStopArgs } from "./config/TouchConfigs";
import { PromptBuilder } from "../../../../core/PromptBuilder";

import { Entity } from "../../../../core/ec/Entity";
import { EntityRegistry } from "../../../entity/EntityRegistry";
import { StringUtils } from "../../../../utils/StringUtils";
import { DuoTouchInteraction } from "./TouchDuo";
import { AppearanceKey, CharacterAppearance } from "../../appearance/CharacterAppearance";

export class TouchInteraction {
    private actorInteractionSlot: TouchInteractionSlot | null = null;
    private targetInteractionSlot: TouchInteractionSlot | null = null;
    // private actorStopAction: ActionStopTouchInteraction | null = null;

    // private contextItem?: CharacterLocationContextItem;

    protected characterAppearance: CharacterAppearance
    constructor(
        public args: TouchInteractionArgs,
        protected entity: Entity,
        protected interactionData: TouchConfig,
        protected registry: EntityRegistry,
    ) {
        this.characterAppearance = entity.require(AppearanceKey)
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
        // return this.actorStopAction;
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
            const txt = StringUtils.fillTemplate(startNote, this.getTemplateValues())
            // NotificationService.addTryPush(txt)
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


        // this.actorStopAction?.removeFromActionSet();
        // this.actorStopAction = null;
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

        // this.actorStopAction = this.getNewAction(this.args.actorChar, stopActionDetails);
    }

    // protected getNewAction(character: Character, stopArgs: TouchStopArgs): ActionStopTouchInteraction {
    //     const newAction = new ActionStopTouchInteraction(character, this);
    //     const templateValues = this.getTemplateValues();
    //     newAction.setActionArgs({
    //         name: StringUtils.fillTemplate(stopArgs.name, templateValues),
    //         layer: CharacterActionLayers.TOUCH,
    //         timing: character instanceof Player ? VoxtaActionTiming.USER_AFTER : VoxtaActionTiming.ASSISTANT_AFTER,
    //         description: StringUtils.fillTemplate(stopArgs.description, templateValues),
    //     });
    //     newAction.init();

    //     return newAction;
    // }

    protected charIsActor() {
        return this.entity.id === this.args.actorId;
    }

    protected charIsTarget() {
        return this.entity.id === this.args.targetId;
    }

    protected activateContext() {
        if (this.interactionData.ctx_txt) {
            // this.contextItem = new CharacterLocationContextItem({
            //     key: this.getContextKey(),
            //     value: StringUtils.fillTemplate(this.interactionData.ctx_txt, this.getTemplateValues()),
            //     roles: []
            // }, this.character.location.getLocationRoleObserver());
        }
    }

    protected getContextKey() {
        //todo override in duo
        // return `${this.character.role}_${this.interactionData.id}`;
    }

    protected deactivateContext() {
        // if (this.contextItem) {
        //     this.contextItem.delete();
        //     this.contextItem = undefined;
        // }
    }

    protected getTemplateValues(): Record<string, string> {
        const templates: Record<string, string> = {};
        // templates['actor_name'] = this.args.actorChar.name;
        // templates['actor_hisHer'] = this.args.actorChar.hisHer;

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
        // NotificationService.addTryPush(txt)
    }
}