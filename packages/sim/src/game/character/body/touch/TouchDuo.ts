
// import { ActionStopTouchInteraction } from "../actions/TouchActions";
import { TouchInteractionArgs } from "./TouchManager";

import { TouchDuoConfig } from "./config/TouchConfigs";
import { TouchInteraction } from "./Touch";
import { Entity } from "../../../../core/ec/Entity";
import { EntityRegistry } from "../../../entity/EntityRegistry";
import { PromptBuilder } from "../../../../core/PromptBuilder";



export class DuoTouchInteraction extends TouchInteraction {

    protected sisterInteraction: TouchInteraction | null = null;
    // private targetStopAction: ActionStopTouchInteraction | null = null;

    constructor(
        args: TouchInteractionArgs,
        entity: Entity,
        public duoInteractionData: TouchDuoConfig,
        registry: EntityRegistry,
    ) {
        super(args, entity, duoInteractionData, registry);
    }

    linkInteractions(sister: DuoTouchInteraction) {
        this.sisterInteraction = sister;
        sister.sisterInteraction = this;
    }

    getTargetStopAction() {
        // return this.targetStopAction;
    }

    deActivateFromStopAction() {

        this.deActivate();
    }

    deActivate(sisterAlreadyDeactivated = false) {


        super.deActivate(sisterAlreadyDeactivated);



        // this.targetStopAction?.removeFromActionSet(); //hereherr
        // this.targetStopAction = null;

        if (!sisterAlreadyDeactivated) {
            this.getActorInteractionSlot()?.removeInteraction(this, false);
            this.getTargetInteractionSlot()?.removeInteraction(this, false);
            this.sisterInteraction?.deActivate(true);
        }
    }


    deActivateAsActor() {
        if (this.charIsActor()) {
            this.deActivate();
        } else {
            this.sisterInteraction?.deActivate();
        }
    }


    appendImagePrompt(promptBuilder: PromptBuilder) {
        if (this.charIsActor()) {
            super.appendImagePrompt(promptBuilder);
            return;
        }
        if (this.duoInteractionData.targetCharEffects?.appearanceClass
            && this.characterAppearance.classManager.isClassCoveredByPose(this.duoInteractionData.targetCharEffects.appearanceClass)) {
            return;
        }
        const img_txt = this.duoInteractionData.targetCharEffects?.img_txt;
        if (img_txt) {
            promptBuilder.addToPos(this.getImgTxt(img_txt));
        }
    }



    protected tryInitStopAction() {
        super.tryInitStopAction();
        if (this.charIsActor()) {
            (this.sisterInteraction as DuoTouchInteraction)
                ?.tryInitStopAction();
            return;
        }

        const stopActionDetails = this.duoInteractionData.targetCharEffects?.stopAction;
        if (!stopActionDetails) {
            return;
        }

        // this.targetStopAction = this.getNewAction(this.args.targetChar, stopActionDetails);
    }

    protected sendStopNote() {
        if (this.charIsActor()) {
            super.sendStopNote();
            return;
        }
        const stopNote = this.duoInteractionData.targetCharEffects?.onStopNote;
        if (stopNote) {
            this.noteHelper(stopNote);
        }
    }

    protected getTemplateValues(): Record<string, string> {
        const templates = super.getTemplateValues();

        // templates['target_name'] = this.args.targetChar.name;
        // templates['target_hisHer'] = this.args.targetChar.hisHer;

        return templates;
    }
}
