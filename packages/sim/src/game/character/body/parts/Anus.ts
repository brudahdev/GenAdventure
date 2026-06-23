import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const anusTags: Taggable = {
    tags: ['anus', 'ass'],
    excludeTags: []
}
export enum AnusEffectSlots {
    PENITRATE = 'penitrate',
}

export class Anus extends BodyPart {

    private penitratedByPenisCharacter: Entity | null = null;
    private penitratedByFingerCharacter: Entity | null = null;

    constructor(body: Body, entity: Entity) {
        super('anus', entity, body, anusTags)
    }

    setPenitrate(character: Entity | null) {
        this.penitratedByPenisCharacter = character;
    }

    onPenitrateFinger(character: Entity) {
        this.penitratedByFingerCharacter = character;
    }

    onPenitrateFingerStop() {
        this.penitratedByFingerCharacter = null;
    }

    // TODO(port): bespoke orgasm logic — needs OrgasmManager + arousalData on the EC model.
    // calcOrgasmRate() {
    //     let rate = 0;
    //     const arousalData = this.body.getCharacter().arousalData;
    //     if (this.penitratedByPenisCharacter) {
    //         rate += 100 / TimeUtils.minutesToMs(arousalData.anal_sex_tto)
    //     }
    //     if (this.penitratedByFingerCharacter) {
    //         rate += 100 / TimeUtils.minutesToMs(arousalData.fingering_anus_tto)
    //     }
    //     return rate;
    // }
}
