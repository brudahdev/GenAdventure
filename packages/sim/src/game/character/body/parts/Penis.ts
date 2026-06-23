import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const penisTags: Taggable = {
    tags: ['penis', 'cock', 'dick', 'member', 'shaft', 'tip', 'pee'],
    excludeTags: []
}
export enum PenisEffectSlots {
    PENITRATE = 'penitrate',
}

/** Ported to the EC model: tags, slot enum, and the penetration "set" methods the
 *  touch interactions call are kept as state-tracking stubs. The bespoke arousal/
 *  orgasm/erection/cum behaviour (OrgasmManager, context items, Voxta actions,
 *  TimedStat stimulation) is commented out pending a port of those subsystems. */
export class Penis extends BodyPart {

    private penitratingPussyCharacter: Entity | null = null;
    private penitratingAssCharacter: Entity | null = null;
    private penitratingMouthCharacter: Entity | null = null;
    private titJobCharacter: Entity | null = null;
    private footJobCharacter: Entity | null = null;
    private handJobCharacter: Entity | null = null;

    private isHard = false;

    constructor(body: Body, entity: Entity) {
        super('penis', entity, body, penisTags)

        // TODO(port): public/private context items + manual-boner/cum Voxta actions.
    }

    // TODO(port): init(stimulation) wired arousal thresholds to erection/cum state.

    setPenitratePussy(character: Entity | null) {
        this.penitratingPussyCharacter = character;
        // TODO(port): this.character.orgasm.onOrgasmRateChange() on change
    }

    setPenitrateAss(character: Entity | null) {
        this.penitratingAssCharacter = character;
    }

    setPenitrateMouth(character: Entity | null) {
        this.penitratingMouthCharacter = character;
    }

    setTitJob(character: Entity | null) {
        this.titJobCharacter = character;
    }

    setFootJob(character: Entity | null) {
        this.footJobCharacter = character;
    }

    setHandJob(character: Entity | null) {
        this.handJobCharacter = character;
    }

    getIsHard() {
        return this.isHard
    }

    // TODO(port): bespoke arousal/orgasm/erection logic omitted during EC port —
    // calcOrgasmRate, onBoner/onBonerStop, setCanCum, ejaculate, onCumAction,
    // updateContextItems and the manual-boner/cum actions all depended on the old
    // Character/OrgasmManager/Voxta-action/TimedStat infrastructure.
}
