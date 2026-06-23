import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const pussyTags: Taggable =
{
    tags: ['pussy', 'vagina', 'clit', 'lip', 'cooch', 'snatch'],
    excludeTags: []
}

export enum PussyEffectSlots {
    PENITRATE = 'penitrate',
}

export interface PussyData {
    orgasmStopAt?: number;
    squirtStopAt?: number;
}

/** Ported to the EC model: tags, slot enum, and the penetration "set" methods the
 *  touch interactions call are kept as state-tracking stubs. The bespoke orgasm/
 *  squirting behaviour (OrgasmManager, context items, scheduler) is commented out
 *  pending a port of those subsystems. */
export class Pussy extends BodyPart {

    private penitratedByPenisCharacter: Entity | null = null;
    private penitratedByFingerCharacter: Entity | null = null;

    private data: PussyData = {}

    constructor(body: Body, entity: Entity) {
        super('pussy', entity, body, pussyTags)
        // TODO(port): context item + orgasm stimulation threshold subscription.
    }

    setPenitrate(character: Entity | null) {
        this.penitratedByPenisCharacter = character;
        // TODO(port): this.character.orgasm.onOrgasmRateChange() on change
    }

    setFingerPenitrate(character: Entity | null) {
        this.penitratedByFingerCharacter = character;
    }

    // TODO(port): bespoke orgasm/squirting logic omitted during EC port —
    // appendBodyPrompt, calcOrgasmRate, onOrgasm/startSquirting, the orgasm/squirt
    // schedulers and context updates all depended on the old Character/OrgasmManager/
    // NotificationService/TimeScheduler infrastructure.
}
