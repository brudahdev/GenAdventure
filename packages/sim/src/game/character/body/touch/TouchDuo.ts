
// import { ActionStopTouchInteraction } from "../actions/TouchActions";
import { TouchInteractionArgs } from "./TouchManager";

import { TouchDuoConfig } from "./config/TouchConfigs";
import { TouchInteraction } from "./Touch";
import { Entity } from "../../../../core/ec/Entity";
import { EntityRegistry } from "../../../entity/EntityRegistry";
import { PromptBuilder } from "../../../../core/PromptBuilder";
import { CharacterIdentityKey } from "../../identity/CharacterIdentity";
import { NotificationService } from "../../../../core/NotificationService";
import { LocationContextItemFactory } from "../../../location/LocationContextItemFactory";
import { InferenceActionManager } from "../../../../core/action-inference/InferenceActionManager";
import { AvatarKey } from "../../Avatar";
import { StopTouchInferenceAction } from "./StopTouchInferenceAction";



export class DuoTouchInteraction extends TouchInteraction {

    protected sisterInteraction: TouchInteraction | null = null;
    private targetStopAction: StopTouchInferenceAction | null = null;

    constructor(
        args: TouchInteractionArgs,
        entity: Entity,
        public duoInteractionData: TouchDuoConfig,
        registry: EntityRegistry,
        notificationService: NotificationService,
        contextItemFactory: LocationContextItemFactory,
        inferenceActionManager: InferenceActionManager
    ) {
        super(args, entity, duoInteractionData, registry, notificationService, contextItemFactory, inferenceActionManager);
    }

    linkInteractions(sister: DuoTouchInteraction) {
        this.sisterInteraction = sister;
        sister.sisterInteraction = this;
    }

    getTargetStopAction() {
        return this.targetStopAction;
    }

    deActivateFromStopAction() {

        this.deActivate();

        const avatar = this.entity.get(AvatarKey);
        avatar?.dirtied();
        avatar?.updateAvatar();

        if (this.sisterInteraction) {
            const sisterAvatar = this.sisterInteraction.getEntity().get(AvatarKey);
            sisterAvatar?.dirtied();
            sisterAvatar?.updateAvatar();
        }
    }

    deActivate(sisterAlreadyDeactivated = false) {

        super.deActivate(sisterAlreadyDeactivated);


        this.targetStopAction?.removeAction();
        this.targetStopAction = null;

        if (!sisterAlreadyDeactivated) {
            this.getActorInteractionSlot()?.removeInteraction(this, false);
            this.getTargetInteractionSlot()?.removeInteraction(this, false);
            this.sisterInteraction?.deActivate(true);

            // Both parties' avatars showed this interaction; mark them dirty so they
            // regenerate without it. The displacing touch only refreshes its own
            // actor/target, so the displaced *target* (e.g. groped npc) would
            // otherwise keep a stale image.
            this.entity.get(AvatarKey)?.dirtied();
            this.sisterInteraction?.getEntity().get(AvatarKey)?.dirtied();
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

        this.targetStopAction = this.newStopAction(this.entity, stopActionDetails);
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

        templates['target_name'] = this.registry.requireById(this.args.targetId).require(CharacterIdentityKey).name;
        templates['target_hisHer'] = this.registry.requireById(this.args.targetId).require(CharacterIdentityKey).config.pronouns.hisHer;

        return templates;
    }
}
