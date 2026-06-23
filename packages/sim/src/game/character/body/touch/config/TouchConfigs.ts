import { Taggable } from "@gen-adventure/shared";
import { TouchInteraction } from "../Touch";
import { TouchInteractionArgs } from "../TouchManager";
import { TouchInteractionSlot } from "../TouchSlot";
import type { Body } from "../../Body";
import type { Entity } from "../../../../../core/ec/Entity";

/** Resolved context handed to a touch interaction's `onActivate`/`onDeactivate`
 *  callbacks. Replaces the old `args.actorChar` / `args.targetChar` `Character`
 *  objects: the actor and target are resolved {@link Entity}s, reached via their
 *  components (`entity.require(BodyKey)` etc.). `args` carries the raw id-based
 *  match input. */
export interface TouchCallbackArgs {
    args: TouchInteractionArgs;
    actor: Entity;
    target: Entity;
}




// import { ICharacterTouchValidationArgs } from "./Touch.effects";
export interface TouchStopArgs {
    name: string;
    description: string;
}
export interface TouchEffectConfig {
    img_txt?: string | string[];
    appearanceClass?: string;
    onStopNote?: string;
    stopAction: TouchStopArgs;
}
export interface TouchActorConfig extends TouchEffectConfig {
    onStartNote?: string;
}
export interface ICharacterTouchValidationArgs {
    actorInteractionSlot?: TouchInteractionSlot<TouchInteraction>;
    targetInteractionSlot?: TouchInteractionSlot<TouchInteraction>;
    touchArgs: TouchInteractionArgs;
}
export interface TouchNonVisualConfig {
    verbTags: Taggable;
    actorPartTag: Taggable | 'any';
    targetPartTags: Taggable | 'any';
    note?: string;
    onActivate?: (ctx: TouchCallbackArgs) => void; //for slapping add permentent effect
}
export interface TouchConfig {
    id: string;
    compatibleWith?: {
        targetSlotContains?: string[]; //ids of othger interactions
    };
    dontApplyIf?: {
        targetSlotContains?: string[]; //ids of othger interactions
    };
    verbTags: Taggable;
    /** The canonical verb word surfaced as a touch option; must match
     *  {@link verbTags} so a UI selection round-trips back to this interaction. */
    verb: string;

    actorPart: keyof Body;
    actorPartTag: Taggable;
    actorPartSlot: string;

    targetPart: keyof Body;
    targetPartTags: Taggable;
    targetPartSlot: string;
    ctx_txt?: string;

    actorCharEffects?: TouchActorConfig;

    validate?: (args: ICharacterTouchValidationArgs) => boolean | void;

    onActivate?: (ctx: TouchCallbackArgs) => void;
    onDeactivate?: (ctx: TouchCallbackArgs) => void;
}
export interface TouchDuoConfig extends TouchConfig {
    targetCharEffects?: TouchEffectConfig;
    poseTarget?: boolean;
    poseMatrix?: PoseMatrixConfig[]; /// any given target pose should only be included in one of the poseMatrixItems
}
export interface PoseMatrixConfig {
    actorPoseIds: string[];
    targetPoseIds: string[];
}

