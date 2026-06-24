


import { TouchInteractionArgs, TouchManagerKey } from "../TouchManager";
import { BodyKey } from "../../Body";
import { AnusEffectSlots } from "../../parts/Anus";
import { assTags } from "../../parts/Ass";
import { FeetEffectSlots, feetTags } from "../../parts/Feet";
import { armTags, HandsEffectSlots, handTags } from "../../parts/Hands";
import { headTags } from "../../parts/Head";
import { hipTags } from "../../parts/Hips";
import { MouthEffectSlots, mouthTags, tongueTags } from "../../parts/Mouth";
import { neckTags } from "../../parts/Neck";
import { nippleTags } from "../../parts/Nipples";
import { PenisEffectSlots, penisTags } from "../../parts/Penis";
import { PussyEffectSlots, pussyTags } from "../../parts/Pussy";
import { shoulderTags } from "../../parts/Shoulders";
import { thighTags } from "../../parts/Thighs";
import { TitsEffectSlots, titsTags } from "../../parts/Tits";
import { TouchDuoConfig } from "./TouchConfigs";
import { TouchConfig } from "./TouchConfigs";
import { TouchNonVisualConfig } from "./TouchConfigs";
import { ICharacterTouchValidationArgs } from "./TouchConfigs";
import { TouchCallbackArgs } from "./TouchConfigs";
import { caressTags, chokeTags, coverTags, fingerTags, footJobTags, grindTags, gropeTags, hjTags, kissTags, lickTags, lookTags, penitrateTags, pinchTags, suckTags, titJobTags } from "./TagsVerb";


export const duoInteractions: TouchDuoConfig[] = [

    {//hands_tits_grope
        id: 'hands_tits_grope',
        verb: 'grope',
        verbTags: gropeTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'tits',
        targetPartTags: titsTags,
        targetPartSlot: TitsEffectSlots.TOUCH,

        ctx_txt: "{{actor_name}} is fondling {{target_name}}'s tits.",

        actorCharEffects: {
            img_txt: 'groping breasts',
            onStartNote: "{{actor_name}} started groping {{target_name}}'s tits.",
            onStopNote: "{{actor_name}} stopped groping {{target_name}}'s tits.",
            stopAction: {
                name: "{{actor_name}}_stop_groping",
                description: "When {{actor_name}} stops groping {{target_name}}'s breasts"
            }
        },
        targetCharEffects: {
            img_txt: [
                'pov groping breasts, pov hands on breasts',
                'pov groping, squeezing tits',
                'pov groping breasts, pov hands on breasts, cleavage',
            ],
            appearanceClass: 'chest',
            onStopNote: "{{target_name}} pushed {{actor_name}}'s hands off of her breasts.",
            stopAction: {
                name: "{{target_name}}_stop_groping",
                description: "When {{target_name}} stops {{actor_name}} groping her"
            }
        },

        onActivate(ctx: TouchCallbackArgs) {
            if (Math.random() < 0.5) {
                ctx.target.get(TouchManagerKey)?.coverAppearanceItem('nipples', true);
            }
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.target.get(TouchManagerKey)?.coverAppearanceItem('nipples', false);//todo possibly need a registry in case multiple effects cover it
        }
    },
    {//hands_nipples_pinch
        id: 'hands_nipples_pinch',
        verb: 'pinch',
        verbTags: pinchTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'nipples',
        targetPartTags: nippleTags,
        targetPartSlot: TitsEffectSlots.TOUCH,

        ctx_txt: "{{actor_name}} is pinching {{target_name}}'s nipples.",

        actorCharEffects: {
            img_txt: 'pinching nipples',
            onStartNote: "{{actor_name}} started pinching {{target_name}}'s nipples.",
            onStopNote: "{{actor_name}} stopped pinching {{target_name}}'s nipples.",
            stopAction: {
                name: "{{actor_name}}_stop_pinching",
                description: "When {{actor_name}} stops pinching {{target_name}}'s nipples"
            }
        },
        targetCharEffects: {
            img_txt: 'pov pinching nipples, pov fingers touching nipples',
            appearanceClass: 'nipples',
            onStopNote: "{{target_name}} pushed {{actor_name}}'s hands off of her nipples.",
            stopAction: {
                name: "{{target_name}}_stop_pinching",
                description: "When {{target_name}} stops {{actor_name}} pinching her"
            }
        },
    },
    {//hands_ass_grope
        id: 'hands_ass_grope',
        verb: 'grope',
        verbTags: gropeTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'ass',
        targetPartTags: assTags,
        targetPartSlot: TitsEffectSlots.TOUCH,

        ctx_txt: "{{actor_name}} is groping {{target_name}}'s ass.",

        actorCharEffects: {
            img_txt: 'groping ass',
            onStartNote: "{{actor_name}} started groping {{target_name}}'s ass.",
            onStopNote: "{{actor_name}} stopped groping {{target_name}}'s ass.",
            stopAction: {
                name: "{{actor_name}}_stop_groping",
                description: "When {{actor_name}} stops groping {{target_name}}'s ass"
            }
        },
        targetCharEffects: {
            img_txt: 'pov groping ass, pov hands on ass',
            appearanceClass: 'ass',
            onStopNote: "{{target_name}} pushed {{actor_name}}'s hands off of her ass.",
            stopAction: {
                name: "{{target_name}}_stop_groping",
                description: "When {{target_name}} stops {{actor_name}} groping her ass"
            }
        },
    },
    {//hands_penis_stroke
        id: 'hands_penis_stroke',
        verb: 'stroke',
        compatibleWith: {
            targetSlotContains: ['mouth_penis_suck', 'mouth_penis_lick', 'mouth_penis_kiss'],
        },
        verbTags: hjTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'penis',
        targetPartTags: penisTags,
        targetPartSlot: PenisEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}} is giving {{target_name}} a hand job.",

        actorCharEffects: {
            img_txt: 'hand on penis, pov hand job',
            onStartNote: "{{actor_name}} started giving {{target_name}} a hand job.",
            onStopNote: "{{actor_name}} stopped giving {{target_name}} a hand job.",
            stopAction: {
                name: "{{actor_name}}_stop_handjob",
                description: "When {{actor_name}} stops giving {{target_name}} a hand job"
            }
        },
        targetCharEffects: {
            img_txt: 'getting hand job',
            onStopNote: "{{target_name}} removed {{actor_name}}'s hand from his penis.",
            stopAction: {
                name: "{{target_name}}_stop_handjob",
                description: "When {{target_name}} stops {{actor_name}} giving him a hand job"
            }
        },

        validate(validationArgs: ICharacterTouchValidationArgs) {
            // const penis = validationArgs.touchArgs.actorChar.body.penis; // TODO(port): isObstructedByClothing check
            // if (penis?.isObstructedByClothing()) {
            //     return false;
            // }//todo
        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.target.get(BodyKey)?.penis?.setHandJob(ctx.actor);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.target.get(BodyKey)?.penis?.setHandJob(null);

        },
    },
    {//hands_pussy_finger
        id: 'hands_pussy_finger',
        verb: 'finger',
        verbTags: fingerTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'pussy',
        targetPartTags: pussyTags,
        targetPartSlot: PussyEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}} is fingering {{target_name}}'s pussy.",


        actorCharEffects: {
            img_txt: 'fingering pussy',
            onStartNote: "{{actor_name}} started fingering {{target_name}}'s pussy.",
            onStopNote: "{{actor_name}} pulled his finger out of {{target_name}}'s pussy.",
            stopAction: {
                name: "{{actor_name}}_stop_fingering",
                description: "When {{actor_name}} stops fingering {{target_name}}'s pussy"
            }
        },
        targetCharEffects: {
            img_txt: 'pov fingering pussy, pov hand touching pussy',
            onStopNote: "{{target_name}} removed {{actor_name}}'s hand from her pussy.",
            stopAction: {
                name: "{{target_name}}_stop_fingering",
                description: "When {{target_name}} stops {{actor_name}} fingering her pussy."
            }
        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.target.get(BodyKey)?.pussy?.setFingerPenitrate(ctx.actor);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.target.get(BodyKey)?.pussy?.setFingerPenitrate(null);
        },
    },
    {//hands_hands_hold
        id: 'hands_hands_hold',
        verb: 'hold',
        dontApplyIf: {
            targetSlotContains: ['hands_hands_hold'], //its the same in each direction
        },
        verbTags: gropeTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'hands',
        targetPartTags: handTags,
        targetPartSlot: HandsEffectSlots.HOLD,

        ctx_txt: "{{actor_name}} and {{target_name}} are holding hands.",


        actorCharEffects: {
            img_txt: 'holding hands',
            onStartNote: "{{actor_name}} started holding hands with {{target_name}}.",
            onStopNote: "{{actor_name}} stopped holding hands with {{target_name}}.",
            stopAction: {
                name: "{{actor_name}}_stop_holding_hands",
                description: "When {{actor_name}} stops holding hands with {{target_name}}"
            }
        },
        targetCharEffects: {
            img_txt: 'pov holding hands',
            onStopNote: "{{target_name}} stopped holding hands with {{actor_name}}.",
            stopAction: {
                name: "{{target_name}}_stop_holding_hands",
                description: "When {{target_name}} stops holding hands with {{actor_name}}"
            }
        },
    },
    {//hands_hips_hold
        id: 'hands_hips_hold', //todo maybe restrict to sitting on compatiblity matrix, option to not move others or self
        verb: 'hold',

        verbTags: gropeTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'hips',
        targetPartTags: hipTags,
        targetPartSlot: HandsEffectSlots.HOLD,

        ctx_txt: "{{actor_name}} is holding {{target_name}}'s hips.",

        actorCharEffects: {
            img_txt: 'holding hips',
            onStartNote: "{{actor_name}} started holding {{target_name}}'s hips.",
            onStopNote: "{{actor_name}} stopped holding {{target_name}}'s hips.",
            stopAction: {
                name: "{{actor_name}}_stop_holding_hips",
                description: "When {{actor_name}} stops holding {{target_name}}'s hips"
            }
        },
        targetCharEffects: {
            img_txt: 'pov hands touching hips',
            onStopNote: "{{target_name}} pushed {{actor_name}}'s hands off her hips.",
            stopAction: {
                name: "{{target_name}}_stop_holding_hips",
                description: "When {{target_name}} stops {{actor_name}} holding her hips"
            }
        },
    },
    {//hands_thighs_hold
        id: 'hands_thighs_hold', //todo maybe restrict to sitting on compatiblity matrix, option to not move others or self
        verb: 'hold',

        verbTags: gropeTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'thighs',
        targetPartTags: thighTags,
        targetPartSlot: HandsEffectSlots.HOLD,

        ctx_txt: "{{actor_name}} is holding {{target_name}}'s thighs.",

        actorCharEffects: {
            img_txt: 'holding thighs',
            onStartNote: "{{actor_name}} put his hands on {{target_name}}'s thighs.",//todo conjugate verb so it can vary, maybe use target part too
            onStopNote: "{{actor_name}} took his hands off {{target_name}}'s thighs.",
            stopAction: {
                name: "{{actor_name}}_stop_holding_thighs",
                description: "When {{actor_name}} stops holding {{target_name}}'s thighs"
            }
        },
        targetCharEffects: {
            img_txt: 'pov hands touching thighs',
            onStopNote: "{{target_name}} pushed {{actor_name}}'s hands off her thighs.",
            stopAction: {
                name: "{{target_name}}_stop_holding_thighs",
                description: "When {{target_name}} stops {{actor_name}} holding her thighs"
            }
        },
    },
    {//hands_head_hold
        id: 'hands_head_hold',
        verb: 'hold',

        verbTags: gropeTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'head',
        targetPartTags: headTags,
        targetPartSlot: HandsEffectSlots.HOLD,

        ctx_txt: "{{actor_name}} is holding {{target_name}}'s head.",

        actorCharEffects: {
            img_txt: 'holding head',
            onStartNote: "{{actor_name}} started holding {{target_name}}'s head.",
            onStopNote: "{{actor_name}} stopped holding {{target_name}}'s head.",
            stopAction: {
                name: "{{actor_name}}_stop_holding_head",
                description: "When {{actor_name}} stops holding {{target_name}}'s head"
            }
        },
        targetCharEffects: {
            img_txt: 'pov hands touching head',
            onStopNote: "{{target_name}} pushed {{actor_name}}'s hands off her head.",
            stopAction: {
                name: "{{target_name}}_stop_holding_head",
                description: "When {{target_name}} stops {{actor_name}} holding her head"
            }
        },
    },
    {//hands_shoulders_hold
        id: 'hands_shoulders_hold',
        verb: 'hold',

        verbTags: gropeTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'shoulders',
        targetPartTags: shoulderTags,
        targetPartSlot: HandsEffectSlots.HOLD,

        ctx_txt: "{{actor_name}}'s hands are on {{target_name}}'s shoulders.",

        actorCharEffects: {
            img_txt: 'holding shoulders',
            onStartNote: "{{actor_name}} put his hands on {{target_name}}'s shoulders.",
            onStopNote: "{{actor_name}} took his hands off {{target_name}}'s shoulders.",
            stopAction: {
                name: "{{actor_name}}_stop_holding_shoulders",
                description: "When {{actor_name}} stops touching {{target_name}}'s shoulders"
            }
        },
        targetCharEffects: {
            img_txt: 'pov hands touching shoulders',
            onStopNote: "{{target_name}} pushed {{actor_name}}'s hands off her shoulders.",
            stopAction: {
                name: "{{target_name}}_stop_holding_shoulders",
                description: "When {{target_name}} stops {{actor_name}} touching her shoulders"
            }
        },
    },
    //todo hands arms hold, but only if target lying on back
    {//hands_neck_choke
        id: 'hands_neck_choke',
        verb: 'choke',

        verbTags: chokeTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'neck',
        targetPartTags: neckTags,
        targetPartSlot: HandsEffectSlots.HOLD,

        ctx_txt: "{{actor_name}} is choking {{target_name}}.",

        actorCharEffects: {
            img_txt: 'choking',
            onStartNote: "{{actor_name}} started choking {{target_name}}.",
            onStopNote: "{{actor_name}} stopped choking {{target_name}}.",
            stopAction: {
                name: "{{actor_name}}_stop_choking",
                description: "When {{actor_name}} stops choking {{target_name}}"
            }
        },
        targetCharEffects: {
            img_txt: 'pov hand on neck, pov choke',
            onStopNote: "{{target_name}} pulled {{actor_name}}'s hand off her neck.",
            stopAction: {
                name: "{{target_name}}_stop_choking",
                description: "When {{target_name}} stops {{actor_name}} choking her."
            }
        },
    },
    {//penis_pussy_penitrate
        id: 'penis_pussy_penitrate',
        verb: 'penitrate',
        verbTags: penitrateTags,

        actorPart: 'penis',
        actorPartTag: penisTags,
        actorPartSlot: PenisEffectSlots.PENITRATE,

        targetPart: 'pussy',
        targetPartTags: pussyTags,
        targetPartSlot: PussyEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}}'s penis is in {{target_name}}'s pussy.",

        actorCharEffects: {
            img_txt: 'penis in vagina',
            onStartNote: "{{actor_name}} inserted {{actor_hisHer}} penis in {{target_name}}'s pussy.",
            onStopNote: "{{actor_name}} pulled {{actor_hisHer}} dick out of {{target_name}}'s pussy.",
            stopAction: {
                name: "{{actor_name}}_stop_fucking",
                description: "When {{actor_name}} stops fucking {{target_name}}"
            }
        },
        targetCharEffects: {
            img_txt: 'pov sex, penis in vagina',
            onStopNote: "{{target_name}} pushed {{actor_name}} out of her pussy.",
            stopAction: {
                name: "{{target_name}}_stop_fucking",
                description: "When {{target_name}} stops {{actor_name}} fucking her"
            }
        },
        poseMatrix: [
            { actorPoseIds: ['stand'], targetPoseIds: ['bent_over'] },
            { actorPoseIds: ['kneel', 'squat'], targetPoseIds: ['lay_on_back'] },
            { actorPoseIds: ['lay_on_back'], targetPoseIds: ['kneel', 'squat', 'sit'] },
        ],

        validate(validationArgs: ICharacterTouchValidationArgs) {
            // const penis = validationArgs.touchArgs.actorChar.body.penis; // TODO(port): isObstructedByClothing check
            // if (penis?.isObstructedByClothing()) {
            //     return false;
            // }todo
        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(BodyKey)?.penis?.setPenitratePussy(ctx.target);
            ctx.target.get(BodyKey)?.pussy?.setPenitrate(ctx.actor);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(BodyKey)?.penis?.setPenitratePussy(null);
            ctx.target.get(BodyKey)?.pussy?.setPenitrate(null);
        },
    },
    {//penis_anus_penitrate
        id: 'penis_anus_penitrate',
        verb: 'penitrate',
        verbTags: penitrateTags,

        actorPart: 'penis',
        actorPartTag: penisTags,
        actorPartSlot: PenisEffectSlots.PENITRATE,

        targetPart: 'anus',
        targetPartTags: assTags,
        targetPartSlot: AnusEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}}'s penis is in {{target_name}}'s anus.",

        actorCharEffects: {
            img_txt: 'penis in anus',
            onStartNote: "{{actor_name}} inserted {{actor_hisHer}} penis in {{target_name}}'s anus.",
            onStopNote: "{{actor_name}} pulled {{actor_hisHer}} dick out of {{target_name}}'s anus.",
            stopAction: {
                name: "{{actor_name}}_stop_fucking",
                description: "When {{actor_name}} stops fucking {{target_name}}"
            }
        },
        targetCharEffects: {
            img_txt: 'pov anal sex, penis in anus',
            onStopNote: "{{target_name}} pushed {{actor_name}} out of her anus.",
            stopAction: {
                name: "{{target_name}}_stop_fucking",
                description: "When {{target_name}} stops {{actor_name}} fucking her"
            }
        },
        poseMatrix: [
            { actorPoseIds: ['stand'], targetPoseIds: ['bent_over'] },
            { actorPoseIds: ['kneel', 'squat'], targetPoseIds: ['lay_on_back'] },
            { actorPoseIds: ['lay_on_back'], targetPoseIds: ['kneel', 'squat', 'sit'] },
        ],

        validate(validationArgs: ICharacterTouchValidationArgs) {
            // const penis = validationArgs.touchArgs.actorChar.body.penis; // TODO(port): isObstructedByClothing check
            // if (penis?.isObstructedByClothing()) {
            //     return false;
            // }todo
            // const anus = validationArgs.touchArgs.targetChar.body.anus; // TODO(port): isObstructedByClothing check
            // if (anus?.isObstructedByClothing()) {
            //     return false;
            // }todo

        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(BodyKey)?.penis?.setPenitrateAss(ctx.target);
            ctx.target.get(BodyKey)?.anus.setPenitrate(ctx.actor);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(BodyKey)?.penis?.setPenitrateAss(null);
            ctx.target.get(BodyKey)?.anus.setPenitrate(null);
        },
    },
    {//penis_mouth_penitrate
        id: 'penis_mouth_penitrate',
        verb: 'penitrate',
        verbTags: penitrateTags,
        //todo also apply hands_head_hold
        actorPart: 'penis',
        actorPartTag: penisTags,
        actorPartSlot: PenisEffectSlots.PENITRATE,

        targetPart: 'mouth',
        targetPartTags: mouthTags,
        targetPartSlot: MouthEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}} is fucking {{target_name}} in the mouth.",


        actorCharEffects: {
            img_txt: 'blowjob',
            onStartNote: "{{actor_name}} started fucking {{target_name}} in the mouth.",
            onStopNote: "{{actor_name}} stopped fucking {{target_name}} in the mouth.",
            stopAction: {
                name: "{{actor_name}}_stop_fucking",
                description: "When {{actor_name}} stops fucking {{target_name}} in the mouth"
            }
        },
        targetCharEffects: {
            img_txt: 'pov blow job, penis in mouth, deepthroat, lips',
            onStopNote: "{{target_name}} pulled his dick out of {{actor_name}}'s mouth.",
            stopAction: {
                name: "{{target_name}}_stop_fucking",
                description: "When {{target_name}} stops {{actor_name}} fucking her in the mouth."
            }
        },
        poseMatrix: [
            { actorPoseIds: ['stand', 'sit'], targetPoseIds: ['kneel', 'squat', 'sit'] },
            { actorPoseIds: ['kneel', 'squat'], targetPoseIds: ['lay_on_stomach'] },
            { actorPoseIds: [], targetPoseIds: ['stand'] },
        ],

        validate(validationArgs: ICharacterTouchValidationArgs) {
            // const penis = validationArgs.touchArgs.actorChar.body.penis; // TODO(port): isObstructedByClothing check
            // if (penis?.isObstructedByClothing()) {
            //     return false;
            // }todo
        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(BodyKey)?.penis?.setPenitrateMouth(ctx.target);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(BodyKey)?.penis?.setPenitrateMouth(null);
        },
    },
    {//penis_tits_penitrate
        id: 'penis_tits_penitrate',
        verb: 'fuck',
        compatibleWith: {
            targetSlotContains: ['mouth_penis_suck', 'mouth_penis_lick', 'mouth_penis_kiss'],
        },

        verbTags: penitrateTags,

        actorPart: 'penis',
        actorPartTag: penisTags,
        actorPartSlot: PenisEffectSlots.PENITRATE,

        targetPart: 'tits',
        targetPartTags: titsTags,
        targetPartSlot: TitsEffectSlots.CLEAVAGE,


        ctx_txt: "{{actor_name}} is fucking {{target_name}}'s tits'.",

        actorCharEffects: {
            img_txt: 'tit job',
            onStartNote: "{{actor_name}} started fucking {{target_name}}'s tits.",
            onStopNote: "{{actor_name}} stoppeed fucking {{target_name}}'s tits.",
            stopAction: {
                name: "{{actor_name}}_stop_tit_fuck",
                description: "When {{actor_name}} stops fucking {{target_name}}'s tits'"
            }
        },
        targetCharEffects: {
            img_txt: 'pov fucking tits, penis between breasts, cleavage',
            appearanceClass: 'chest',
            onStopNote: "{{target_name}} pulled her tits away from {{actor_name}}'s cock.",
            stopAction: {
                name: "{{target_name}}_stop_tit_fuck",
                description: "When {{target_name}} stops letting {{actor_name}} fuck her tits."
            }
        },
        // poseMatrix: [ //todo
        //     { actorPoseIds: ['kneel', 'sit', 'squat'], targetPoseIds: ['stand', 'sit'] },
        //     { actorPoseIds: [], targetPoseIds: ['lay_on_stomach'] },
        //     { actorPoseIds: ['lay_on_stomach'], targetPoseIds: ['lay_on_back', 'lay_on_side', 'kneel', 'squat'] },
        // ],

        validate(validationArgs: ICharacterTouchValidationArgs) {
            // const penis = validationArgs.touchArgs.actorChar.body.penis; // TODO(port): isObstructedByClothing check
            // if (penis?.isObstructedByClothing()) {
            //     return false;
            // }todo
        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(BodyKey)?.penis?.setTitJob(ctx.actor);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(BodyKey)?.penis?.setTitJob(null);
        },
    },
    {//mouth_penis_suck
        //todo inform llm it can switch between kissing sucking and licking?
        //or do it automatically?
        id: 'mouth_penis_suck',
        verb: 'suck',
        verbTags: suckTags,

        actorPart: 'mouth',
        actorPartTag: mouthTags,
        actorPartSlot: MouthEffectSlots.PENITRATE,

        targetPart: 'penis',
        targetPartTags: penisTags,
        targetPartSlot: PenisEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}} is sucking {{target_name}}'s penis.",

        actorCharEffects: {
            img_txt: 'pov blow job, penis in mouth, deepthroat, lips',
            appearanceClass: 'face',
            onStartNote: "{{actor_name}} started sucking {{target_name}}'s dick.",
            onStopNote: "{{actor_name}} stopped sucking {{target_name}}'s dick.",
            stopAction: {
                name: "{{actor_name}}_stop_sucking",
                description: "When {{actor_name}} stops sucking {{target_name}}'s dick"
            }
        },
        targetCharEffects: {
            img_txt: 'blowjob',
            onStopNote: "{{target_name}} pulled his dick out of {{actor_name}}'s mouth.",
            stopAction: {
                name: "{{target_name}}_stop_sucking",
                description: "When {{target_name}} stops {{actor_name}} sucking her"
            }
        },
        poseMatrix: [
            { actorPoseIds: ['kneel', 'sit', 'squat'], targetPoseIds: ['stand', 'kneel', 'squat', 'sit'] },
            { actorPoseIds: [], targetPoseIds: ['lay_on_stomach'] },
            { actorPoseIds: ['lay_on_stomach'], targetPoseIds: ['lay_on_back', 'lay_on_side'] },
        ],

        validate(validationArgs: ICharacterTouchValidationArgs) {
            // const penis = validationArgs.touchArgs.actorChar.body.penis; // TODO(port): isObstructedByClothing check
            // if (penis?.isObstructedByClothing()) {
            //     return false;
            // }todo
        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.target.get(BodyKey)?.penis?.setPenitrateMouth(ctx.actor);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.target.get(BodyKey)?.penis?.setPenitrateMouth(null);
        },
    },
    {//mouth_penis_lick
        id: 'mouth_penis_lick',
        verb: 'lick',
        verbTags: lickTags,

        actorPart: 'mouth',
        actorPartTag: tongueTags,
        actorPartSlot: MouthEffectSlots.PENITRATE,

        targetPart: 'penis',
        targetPartTags: penisTags,
        targetPartSlot: PenisEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}} is licking {{target_name}}'s penis.",

        actorCharEffects: {
            img_txt: 'pov licking penis',
            appearanceClass: 'face',
            onStartNote: "{{actor_name}} started licking {{target_name}}'s dick.",
            onStopNote: "{{actor_name}} stopped licking {{target_name}}'s dick.",
            stopAction: {
                name: "{{actor_name}}_stop_licking",
                description: "When {{actor_name}} stops licking {{target_name}}'s dick"
            }
        },
        targetCharEffects: {
            img_txt: 'dick getting licked',
            onStopNote: "{{target_name}} pulled his dick out of {{actor_name}}'s mouth.",
            stopAction: {
                name: "{{target_name}}_stop_licking",
                description: "When {{target_name}} stops {{actor_name}} licking him"
            }
        },
        poseMatrix: [
            { actorPoseIds: ['kneel', 'sit', 'squat'], targetPoseIds: ['stand', 'kneel', 'squat', 'sit'] },
            { actorPoseIds: [], targetPoseIds: ['lay_on_stomach'] },
            { actorPoseIds: ['lay_on_stomach'], targetPoseIds: ['lay_on_back', 'lay_on_side'] },
        ],

        validate(validationArgs: ICharacterTouchValidationArgs) {
            // const penis = validationArgs.touchArgs.actorChar.body.penis; // TODO(port): isObstructedByClothing check
            // if (penis?.isObstructedByClothing()) {
            //     return false;
            // }todo
        },
        onActivate(ctx: TouchCallbackArgs) {
            ctx.target.get(BodyKey)?.penis?.setPenitrateMouth(ctx.actor);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.target.get(BodyKey)?.penis?.setPenitrateMouth(null);
        },
    },
    {//mouth_penis_kiss
        //make one off? stop after msgs todo
        id: 'mouth_penis_kiss',
        verb: 'kiss',
        verbTags: kissTags,

        actorPart: 'mouth',
        actorPartTag: mouthTags,
        actorPartSlot: MouthEffectSlots.PENITRATE,

        targetPart: 'penis',
        targetPartTags: penisTags,
        targetPartSlot: PenisEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}} is kissing {{target_name}}'s penis.",

        actorCharEffects: {
            img_txt: 'pov kissing penis, kissing, pucker lips',
            appearanceClass: 'face',
            onStartNote: "{{actor_name}} started kissing {{target_name}}'s dick.",
            onStopNote: "{{actor_name}} stopped kissing {{target_name}}'s dick.",
            stopAction: {
                name: "{{actor_name}}_stop_kissing",
                description: "When {{actor_name}} stops kissing {{target_name}}'s dick"
            }
        },
        targetCharEffects: {
            img_txt: 'dick being kissed',
            onStopNote: "{{target_name}} pulled his dick out of {{actor_name}}'s mouth.",
            stopAction: {
                name: "{{target_name}}_stop_kissing",
                description: "When {{target_name}} stops {{actor_name}} kissing him"
            }
        },
        poseMatrix: [
            { actorPoseIds: ['kneel', 'sit', 'squat'], targetPoseIds: ['stand', 'kneel', 'squat', 'sit'] },
            { actorPoseIds: [], targetPoseIds: ['lay_on_stomach'] },
            { actorPoseIds: ['lay_on_stomach'], targetPoseIds: ['lay_on_back', 'lay_on_side'] },
        ],

        validate(validationArgs: ICharacterTouchValidationArgs) {
            // const penis = validationArgs.touchArgs.actorChar.body.penis; // TODO(port): isObstructedByClothing check
            // if (penis?.isObstructedByClothing()) {
            //     return false;
            // }todo
        }
    },
    {//tits_penis_job
        id: 'tits_penis_job',
        verb: 'rub',
        compatibleWith: {
            targetSlotContains: ['mouth_penis_suck', 'mouth_penis_lick', 'mouth_penis_kiss'],
        },

        verbTags: titJobTags,

        actorPart: 'tits',
        actorPartTag: titsTags,
        actorPartSlot: TitsEffectSlots.CLEAVAGE,

        targetPart: 'penis',
        targetPartTags: penisTags,
        targetPartSlot: PenisEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}} giving {{target_name}} a tit job.",

        actorCharEffects: {
            img_txt: 'self push breasts together, pov fucking tits, penis between breasts, cleavage',
            appearanceClass: 'chest',
            onStartNote: "{{actor_name}} started giving {{target_name}} a tit job.",
            onStopNote: "{{actor_name}} stopped giving {{target_name}} a tit job.",
            stopAction: {
                name: "{{actor_name}}_stop_titjob",
                description: "When {{actor_name}} stops giving {{target_name}} a tit job"
            }
        },
        targetCharEffects: {
            img_txt: 'tit job',
            onStopNote: "{{target_name}} pulled his dick out of {{actor_name}}'s tits.",
            stopAction: {
                name: "{{target_name}}_stop_titjob",
                description: "When {{target_name}} pulls his dick out of {{actor_name}}'s tits"
            }
        },
        poseMatrix: [
            { actorPoseIds: ['kneel', 'sit', 'squat'], targetPoseIds: ['stand', 'sit'] },
            { actorPoseIds: [], targetPoseIds: ['lay_on_stomach'] },
            { actorPoseIds: ['lay_on_stomach'], targetPoseIds: ['lay_on_back', 'lay_on_side', 'kneel', 'squat'] },
        ],

        validate(validationArgs: ICharacterTouchValidationArgs) {
            // const penis = validationArgs.touchArgs.actorChar.body.penis; // TODO(port): isObstructedByClothing check
            // if (penis?.isObstructedByClothing()) {
            //     return false;
            // }todo
        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.target.get(BodyKey)?.penis?.setTitJob(ctx.actor);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.target.get(BodyKey)?.penis?.setTitJob(null);
        },
    },
    {//feet_penis_job
        id: 'feet_penis_job',
        verb: 'rub',
        verbTags: footJobTags,

        actorPart: 'feet',
        actorPartTag: feetTags,
        actorPartSlot: FeetEffectSlots.PENITRATE,

        targetPart: 'penis',
        targetPartTags: penisTags,
        targetPartSlot: PenisEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}} giving {{target_name}} a foot job.",

        actorCharEffects: {
            img_txt: 'feet on penis, pov foot job',
            onStartNote: "{{actor_name}} started giving {{target_name}} a foot job.",
            onStopNote: "{{actor_name}} stopped giving {{target_name}} a foot job.",
            stopAction: {
                name: "{{actor_name}}_stop_footjob",
                description: "When {{actor_name}} stops giving {{target_name}} a foot job"
            }
        },
        targetCharEffects: {
            img_txt: 'getting foot job',
            onStopNote: "{{target_name}} pulled his dick out from {{actor_name}}'s feet.",
            stopAction: {
                name: "{{target_name}}_stop_footjob",
                description: "When {{target_name}} stops the foot job"
            }
        },
        poseMatrix: [
            { actorPoseIds: ['lay_on_back', 'sit', 'lay_on_stomach'], targetPoseIds: ['any'] },
            { actorPoseIds: [], targetPoseIds: ['lay_on_stomach'] },
        ],

        validate(validationArgs: ICharacterTouchValidationArgs) {
            // const penis = validationArgs.touchArgs.actorChar.body.penis; // TODO(port): isObstructedByClothing check
            // if (penis?.isObstructedByClothing()) {
            //     return false;
            // }todo
        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.target.get(BodyKey)?.penis?.setFootJob(ctx.actor);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.target.get(BodyKey)?.penis?.setFootJob(null);
        },
    },
];

export const soloInteractions: TouchConfig[] = [ //todo combine definition with a self flag
    {//hands_pussy_finger_self
        id: 'hands_pussy_finger_self',
        verb: 'finger',
        dontApplyIf: {
            targetSlotContains: ['hands_pussy_finger'], //ie dont finger self if someone else is already fingering me
        },
        verbTags: fingerTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'pussy',
        targetPartTags: pussyTags,
        targetPartSlot: PussyEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}} is fingering {{actor_hisHer}}self.",

        actorCharEffects: {
            img_txt: 'solo fingering self',
            onStartNote: "{{actor_name}} inserted a finger in her pussy.",
            onStopNote: "{{actor_name}} pulled her finger out of her pussy.",
            stopAction: {
                name: "{{actor_name}}_stop_fingering",
                description: "When {{actor_name}} stops fingering herself"
            }
        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(BodyKey)?.pussy?.setFingerPenitrate(ctx.actor);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(BodyKey)?.pussy?.setFingerPenitrate(null);
        },
    },
    {//hands_tits_grope_self
        id: 'hands_tits_grope_self',
        verb: 'grope',
        dontApplyIf: {
            targetSlotContains: ['hands_tits_grope', 'hands_nipples_pinch'], //ie dont grope self if someone else is already groping me
        },
        verbTags: gropeTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'tits',
        targetPartTags: titsTags,
        targetPartSlot: TitsEffectSlots.TOUCH,

        ctx_txt: "{{actor_name}} is fondling {{actor_hisHer}} breasts.",

        actorCharEffects: {
            img_txt: [
                'solo groping breasts self, solo hands on breasts, grope self',
                'solo squeezing breasts together, squeezing self',
                'solo groping breasts, solo hands on breasts, cleavage, self',
                'solo hands squeezing breasts together, squeezing self, cleavage self',
            ],
            appearanceClass: 'chest',
            onStartNote: "{{actor_name}} started groping her breasts.",
            onStopNote: "{{actor_name}} stopped groping her breasts.",
            stopAction: {
                name: "{{actor_name}}_stop_groping",
                description: "When {{actor_name}} stops groping her breasts."
            }
        },

        onActivate(ctx: TouchCallbackArgs) {
            if (Math.random() < 0.5) {
                ctx.actor.get(TouchManagerKey)?.coverAppearanceItem('nipples', true);
            }
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(TouchManagerKey)?.coverAppearanceItem('nipples', false);//todo possibly need a registry in case multiple effects cover it
        }
    },
    {//hands_tits_cover_self
        id: 'hands_tits_cover_self',
        verb: 'cover',
        dontApplyIf: {
            targetSlotContains: ['hands_tits_grope', 'hands_nipples_pinch'],
        },
        verbTags: coverTags,

        actorPart: 'hands',
        actorPartTag: {
            tags: [...handTags.tags, ...armTags.tags],
        },
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'tits',
        targetPartTags: titsTags,
        targetPartSlot: TitsEffectSlots.TOUCH,

        ctx_txt: "{{actor_name}} is covering {{actor_hisHer}} breasts.",

        actorCharEffects: {
            img_txt: 'covering breasts',
            appearanceClass: 'chest',
            onStartNote: "{{actor_name}} started covering her breasts.",
            onStopNote: "{{actor_name}} stopped covering her breasts.",
            stopAction: {
                name: "{{actor_name}}_stop_covering",
                description: "When {{actor_name}} stops covering her breasts."
            }
        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(TouchManagerKey)?.coverAppearanceItem('nipples', true);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(TouchManagerKey)?.coverAppearanceItem('nipples', false);//todo possibly need a registry in case multiple effects cover it
        }
    },
    {//hands_pussy_cover_self
        id: 'hands_pussy_cover_self',
        verb: 'cover',
        dontApplyIf: {
            targetSlotContains: ['hands_pussy_finger', 'penis_pussy_penitrate'],
        },
        verbTags: coverTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'pussy',
        targetPartTags: pussyTags,
        targetPartSlot: PussyEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}} is covering {{actor_hisHer}} pussy with her hand.",

        actorCharEffects: {
            img_txt: 'solo hand covering crotch',
            onStartNote: "{{actor_name}} started covering her pussy with her hand.",
            onStopNote: "{{actor_name}} stopped covering her pussy with her hand.",
            stopAction: {
                name: "{{actor_name}}_stop_covering",
                description: "When {{actor_name}} stops covering her pussy."
            }
        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(TouchManagerKey)?.coverAppearanceItem('pussy', true);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(TouchManagerKey)?.coverAppearanceItem('pussy', false);//todo possibly need a registry in case multiple effects cover it
        }
    },
    {//hands_nipples_pinch_self
        id: 'hands_nipples_pinch_self',
        verb: 'pinch',
        verbTags: pinchTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'tits',
        targetPartTags: nippleTags,
        targetPartSlot: TitsEffectSlots.TOUCH,

        ctx_txt: "{{actor_name}} is pinching {{actor_hisHer}} nipples.",

        actorCharEffects: {
            img_txt: 'solo pinching nipples self',
            appearanceClass: 'nipples',
            onStartNote: "{{actor_name}} started pinching her nipples.",
            onStopNote: "{{actor_name}} stopped pinching her nipples.",
            stopAction: {
                name: "{{actor_name}}_stop_pinching",
                description: "When {{actor_name}} stops pinching her nipples."
            }
        },
    },
    {//hands_penis_stroke_self
        id: 'hands_penis_stroke_self',
        verb: 'stroke',
        verbTags: hjTags,

        actorPart: 'hands',
        actorPartTag: handTags,
        actorPartSlot: HandsEffectSlots.HOLD,

        targetPart: 'penis',
        targetPartTags: penisTags,
        targetPartSlot: PenisEffectSlots.PENITRATE,

        ctx_txt: "{{actor_name}} is stroking {{actor_hisHer}} penis.",

        actorCharEffects: {
            img_txt: 'man masturbating',
            onStartNote: "{{actor_name}} started jacking off.",
            onStopNote: "{{actor_name}} stopped jacking off.",
            stopAction: {
                name: "{{actor_name}}_stop_masturbating",
                description: "When {{actor_name}} stops masturbating"
            }
        },

        validate(validationArgs: ICharacterTouchValidationArgs) {
            // const penis = validationArgs.touchArgs.actorChar.body.penis; // TODO(port): isObstructedByClothing check
            // if (penis?.isObstructedByClothing()) {
            //     return false;
            // }todo
        },

        onActivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(BodyKey)?.penis?.setHandJob(ctx.actor);
        },

        onDeactivate(ctx: TouchCallbackArgs) {
            ctx.actor.get(BodyKey)?.penis?.setHandJob(null);
        },
    },
];


// NOTE(port): the non-visual interactions injected a `secret` + `instructions`
// chat note via the old `globalThis.chat` API, which has no equivalent yet in the
// EC/Voxta model. The side-effect bodies are commented out (structural stub); the
// match configs are kept so the rules still register. Re-wire to the chat/context
// service when porting that subsystem. `ctx.actor`/`ctx.target` are Entities, so
// names come from `entity.require(CharacterIdentityKey).name`.
export const nonVisualInteractions: TouchNonVisualConfig[] = [
    {// kiss any other person part
        verbTags: kissTags,
        actorPartTag: mouthTags,
        targetPartTags: 'any',
        onActivate(ctx: TouchCallbackArgs) {
            // if (ctx.actor === ctx.target) return; // replace with self flag
            // const txt = `${actorName} kissed ${targetName}'s ${ctx.args.targetBodyPart}.`;
            // chat.secret(txt); chat.instructions(txt);
        },

    },
    {// lick any other person part
        verbTags: lickTags,
        actorPartTag: mouthTags,
        targetPartTags: 'any',
        onActivate(ctx: TouchCallbackArgs) {
            // if (ctx.actor === ctx.target) return; // replace with self flag
            // const txt = `${actorName} licked ${targetName}'s ${ctx.args.targetBodyPart}.`;
            // chat.secret(txt); chat.instructions(txt);
        },

    },
    {// look at part
        verbTags: lookTags,
        actorPartTag: 'any',
        targetPartTags: 'any',
        onActivate(ctx: TouchCallbackArgs) {
            // let txt = `${actorName} started looking at ${targetName}'s ${ctx.args.targetBodyPart}.`;
            // if (ctx.actor === ctx.target) txt = `${actorName} started looking at her own ${ctx.args.targetBodyPart}.`;
            // chat.secret(txt); chat.instructions(txt);
        },

    },
    {// grind hips other
        verbTags: grindTags,
        actorPartTag: hipTags,
        targetPartTags: 'any',
        onActivate(ctx: TouchCallbackArgs) {
            // if (ctx.actor === ctx.target) return;
            // const txt = `${actorName} started grinding her hips against ${targetName}'s ${ctx.args.targetBodyPart}.`;
            // chat.secret(txt); chat.instructions(txt);
        },
    },
    {// caress
        verbTags: caressTags,
        actorPartTag: handTags,
        targetPartTags: 'any',
        onActivate(ctx: TouchCallbackArgs) {
            // let txt = `${actorName} started caressing ${targetName}'s ${ctx.args.targetBodyPart}.`;
            // if (ctx.actor === ctx.target) txt = `${actorName} started caressing ${actorHisHer}'s ${ctx.args.targetBodyPart}.`;
            // chat.secret(txt); chat.instructions(txt);
        },
    },
    //todo generic lick?
    {// lick lips self todo this one can be visual, and a one off
        verbTags: lickTags,
        actorPartTag: tongueTags,
        targetPartTags: mouthTags,
        onActivate(ctx: TouchCallbackArgs) {
            // if (ctx.actor !== ctx.target) return; // replace with self flag
            // const txt = `${actorName} licked her lips.`;
            // chat.secret(txt); chat.instructions(txt);
            //todo clear cum. differentiate cumming in or out
        },

    }
]

