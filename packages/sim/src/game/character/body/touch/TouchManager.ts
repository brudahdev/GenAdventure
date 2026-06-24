import { Entity } from "../../../../core/ec/Entity";
import { defineKey } from "../../../../core/ec/ComponentKey";
import { defineFactory } from "../../../../core/ec/ComponentFactory";
import { Logger } from "../../../../core/Logger";
import { matchesTaggable } from "../../../../core/TagUtils";
import { EntityRegistry } from "../../../entity/EntityRegistry";
import { CharacterIdentityKey } from "../../identity/CharacterIdentity";
import { BodyPart } from "../BodyPart";
import { BodyKey } from "../Body";
import { TouchConfig, TouchDuoConfig, TouchNonVisualConfig } from "./config/TouchConfigs";
import { getDuoInteractions, getNonVisualInteractions, getSoloInteractions } from "./config/touchInteractionData";
import { TouchInteraction } from "./Touch";
import { DuoTouchInteraction } from "./TouchDuo";
import { TouchInteractionSlot } from "./TouchSlot";
import { TouchValidator } from "./TouchValidator";
import { TouchInferenceAction } from "./TouchInferenceAction";
import { PLAYER_CHARACTER_ID } from "@gen-adventure/shared";
import { EventSystem } from "../../../EventSystem";
import { BehaviorDispatcher } from "../../../behavior/BehaviorDispatcher";
import { InferenceActionManager } from "../../../../core/action-inference/InferenceActionManager";
import { AvatarKey } from "../../Avatar";
import { NotificationService } from "../../../../core/NotificationService";
import { LocationContextItemFactory } from "../../../location/LocationContextItemFactory";



//  targetCharEffects: {
//             img_txt: 'pov fucking tits, penis between breasts, cleavage',
//             appearanceClass todo check this field
export interface TouchInteractionArgs {
    actorId: string;
    targetId: string;
    actorPartTag: string;
    targetPartTag: string;
    verb: string;
}

export const TouchManagerKey = defineKey<TouchManager>("character.touch")
export const touchManagerFactory = defineFactory(TouchManagerKey, (entity, c) =>
    new TouchManager(
        entity,
        c.resolve(EntityRegistry),
        c.resolve(EventSystem),
        c.resolve(InferenceActionManager),
        c.resolve(BehaviorDispatcher),
        c.resolve(NotificationService),
        c.resolve(LocationContextItemFactory),
        c.resolve(InferenceActionManager),
    ))

export class TouchManager {
    logger: Logger

    // private touchPersister: TouchPersister;
    private validator: TouchValidator;

    private touchAction?: TouchInferenceAction;

    constructor(
        private readonly entity: Entity,
        private readonly registry: EntityRegistry,
        eventSystem: EventSystem,
        manager: InferenceActionManager,
        dispatcher: BehaviorDispatcher,
        private readonly notificationService: NotificationService,
        private readonly contextItemFactory: LocationContextItemFactory,
        private readonly inferenceActionManager: InferenceActionManager,
    ) {

        this.logger = new Logger(entity.require(CharacterIdentityKey).name + "_TouchManager");
        this.validator = new TouchValidator(
            // this.character
        );
        // this.touchPersister = new TouchPersister(character);

        if (entity.id != PLAYER_CHARACTER_ID) {
            this.touchAction = new TouchInferenceAction(
                entity,
                eventSystem,
                manager,
                registry,
                dispatcher
            );
        }

    }

    save() {
        // this.touchPersister.save();
    }

    applyTouch(args: TouchInteractionArgs): boolean {

        let applied = false;

        if (args.actorId === args.targetId) {
            const interaction = this.findMatchingInteraction(args, getSoloInteractions());
            if (interaction) {
                applied = this.tryApplyInteraction(args, interaction, true)
            }

        } else {
            const interaction = this.findMatchingInteraction(args, getDuoInteractions());
            if (interaction) {
                applied = this.tryApplyInteraction(args, interaction, false)
            }
        }

        const actor = this.registry.getById(args.actorId);
        const target = this.registry.getById(args.targetId);

        if (!applied) {
            const nonVisualInteraction = this.findMatchingNonVisualInteraction(args, getNonVisualInteractions());
            if (nonVisualInteraction) {

                if (actor && target) {
                    nonVisualInteraction.onActivate?.({ args, actor, target });
                }
                return false;
            }
        }

        if (applied) {
            actor?.get(AvatarKey)?.dirtied();
            target?.get(AvatarKey)?.dirtied();
        }

        return applied;
    }

    tryApplyInteraction(
        args: TouchInteractionArgs,
        interaction?: TouchConfig | TouchDuoConfig,
        isSolo = false
    ): boolean {
        if (!interaction) return false;

        const resolved = this.resolvePartsAndSlots(args, interaction);
        if (!resolved) return false;

        const {
            actorEntity,
            targetEntity,
            actorPart,
            actorSlot,
            targetPart,
            targetSlot
        } = resolved;

        if (!this.passesValidation(args, interaction, actorSlot, targetSlot)) {
            this.logger.debug(`touch interaction ${interaction.id} failed validation`);
            return false;
        }

        if (isSolo) {
            return this.applySoloInteraction(
                args,
                interaction,
                actorEntity,
                actorPart,
                actorSlot,
                targetPart,
                targetSlot
            );
        } else {
            return this.applyDuoInteraction(
                args,
                interaction as TouchDuoConfig,
                actorEntity,
                actorPart,
                actorSlot,
                targetEntity,
                targetPart,
                targetSlot
            );
        }
    }

    findMatchingInteraction(args: TouchInteractionArgs, interactions: TouchDuoConfig[]): TouchDuoConfig | undefined {
        const matchingRule = interactions.find(rule => {
            const actorPartMatches = matchesTaggable(args.actorPartTag, rule.actorPartTag);
            const touchedPartMatches = matchesTaggable(args.targetPartTag, rule.targetPartTags);
            const verbMatches = matchesTaggable(args.verb, rule.verbTags);
            return verbMatches && actorPartMatches && touchedPartMatches;
        });



        if (matchingRule) {
            this.logger.debug(`${matchingRule.id} matches verb, actor part, and target part`);
        } else {
            this.logger.debug(`unable to find touch interaction that matches verb, actor part, and target part`);

        }
        return matchingRule;
    }

    findMatchingNonVisualInteraction(args: TouchInteractionArgs, interactions: TouchNonVisualConfig[]): TouchNonVisualConfig | undefined {
        const matchingRule = interactions.find(rule => {

            const actorPartMatches = rule.actorPartTag === 'any' || matchesTaggable(args.actorPartTag, rule.actorPartTag);
            const touchedPartMatches = rule.targetPartTags === 'any' || matchesTaggable(args.targetPartTag, rule.targetPartTags);
            const verbMatches = matchesTaggable(args.verb, rule.verbTags);
            return verbMatches && actorPartMatches && touchedPartMatches;
        });
        return matchingRule;
    }

    coverAppearanceItem(appearanceId: string, covered: boolean) {
        // var appearanceItem = this.character.appearance.appearanceItems.find(appearanceItem => { return appearanceItem.config.id == appearanceId })
        // if (appearanceItem)todo
        //     appearanceItem.setIsCoveredByInteraction(covered);
    }



    private resolvePartsAndSlots(
        args: TouchInteractionArgs,
        interaction: TouchConfig | TouchDuoConfig
    ) {
        const actorEntity = this.registry.getById(args.actorId);
        const targetEntity = this.registry.getById(args.targetId);

        if (!actorEntity || !targetEntity) {
            this.logger.debug(
                `actor or target entity not found for touch interaction ${interaction.id}. Interaction will not be applied.`
            );
            return null;
        }

        const actorPart = actorEntity.get(BodyKey)?.getPart(interaction.actorPart);
        const targetPart = targetEntity.get(BodyKey)?.getPart(interaction.targetPart);

        if (!actorPart) {
            this.logger.debug(
                `${nameOf(actorEntity)} does not have a ${interaction.actorPart}. Interaction will not be applied.`
            );
            return null;
        }

        if (!targetPart) {
            this.logger.debug(
                `${nameOf(targetEntity)} does not have a ${interaction.targetPart}. Interaction will not be applied.`
            );
            return null;
        }

        return {
            actorEntity,
            targetEntity,
            actorPart,
            targetPart,
            actorSlot: actorPart.getSlot(interaction.actorPartSlot),
            targetSlot: targetPart.getSlot(interaction.targetPartSlot)
        };
    }

    private passesValidation(
        args: TouchInteractionArgs,
        interaction: TouchConfig | TouchDuoConfig,
        actorSlot: TouchInteractionSlot<TouchInteraction>,
        targetSlot: TouchInteractionSlot<TouchInteraction>
    ): boolean {
        if (!interaction.validate) return true;//TODOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
        return true;
        // return interaction.validate({
        //     touchArgs: args,
        //     actorInteractionSlot: actorSlot,
        //     targetInteractionSlot: targetSlot
        // });
    }

    private applySoloInteraction(
        args: TouchInteractionArgs,
        interaction: TouchConfig,
        actorEntity: Entity,
        actorPart: BodyPart,
        actorSlot: TouchInteractionSlot<TouchInteraction>,
        targetPart: BodyPart,
        targetSlot: TouchInteractionSlot<TouchInteraction>
    ): boolean {
        const actorInteraction = new TouchInteraction(
            args,
            actorEntity,
            interaction,
            this.registry,
            this.notificationService,
            this.contextItemFactory,
            this.inferenceActionManager
        );

        if (actorPart.slotContains(interaction.actorPartSlot, actorInteraction)) {
            this.logger.debug(
                `touch interaction ${interaction.id} already applied to ${nameOf(actorEntity)}`
            );
            return false;
        }

        const addedToActorSlot = actorSlot.addInteraction(actorInteraction);
        if (!addedToActorSlot) {
            return false;
        }

        const addedToTargetSlot = targetSlot.addInteraction(actorInteraction);
        if (!addedToTargetSlot) {
            actorSlot.removeInteraction(actorInteraction, false);
            return false;
        }

        actorInteraction.setActorInteractionSlot(actorSlot);
        actorInteraction.setTargetInteractionSlot(targetSlot);


        actorInteraction.activate();
        return true;
    }

    private applyDuoInteraction(
        args: TouchInteractionArgs,
        interaction: TouchDuoConfig,
        actorEntity: Entity,
        actorPart: BodyPart,
        actorSlot: TouchInteractionSlot<TouchInteraction>,
        targetEntity: Entity,
        targetPart: BodyPart,
        targetSlot: TouchInteractionSlot<TouchInteraction>
    ): boolean {

        const actorInteraction = new DuoTouchInteraction(
            args,
            actorEntity,
            interaction,
            this.registry,
            this.notificationService,
            this.contextItemFactory,
            this.inferenceActionManager
        );
        const targetInteraction = new DuoTouchInteraction(
            args,
            targetEntity,
            interaction,
            this.registry,
            this.notificationService,
            this.contextItemFactory,
            this.inferenceActionManager
        );

        actorInteraction.linkInteractions(targetInteraction);

        const actorBlocked = actorPart.slotContains(
            interaction.actorPartSlot,
            actorInteraction
        );
        const targetBlocked = targetPart.slotContains(
            interaction.targetPartSlot,
            targetInteraction
        );

        if (actorBlocked || targetBlocked) {
            this.logger.debug(
                `touch interaction ${interaction.id} could not be applied to both parties`
            );
            return false;
        }

        const addedToActorSlot = actorSlot.addInteraction(actorInteraction);
        if (!addedToActorSlot) {
            return false;
        }

        const addedToTargetSlot = targetSlot.addInteraction(targetInteraction);
        if (!addedToTargetSlot) {
            actorSlot.removeInteraction(actorInteraction, false);
            return false;
        }

        // if (!this.validator.poseInteractionMatrixCheck(interaction, targetEntity)) {
        //     actorSlot.removeInteraction(actorInteraction, false);
        //     targetSlot.removeInteraction(targetInteraction, false);
        //     return false;
        // }

        actorInteraction.setActorInteractionSlot(actorSlot);
        actorInteraction.setTargetInteractionSlot(targetSlot);

        targetInteraction.setActorInteractionSlot(actorSlot);
        targetInteraction.setTargetInteractionSlot(targetSlot);

        actorInteraction.activate();
        return true;
    }
}

/** Best-effort display name for log messages. */
function nameOf(entity: Entity): string {
    return entity.get(CharacterIdentityKey)?.name ?? entity.id;
}
