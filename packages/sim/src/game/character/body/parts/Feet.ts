import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const feetTags: Taggable = {
    tags: ['feet', 'foot', 'toe'],
    excludeTags: []
}

export enum FeetEffectSlots {
    PENITRATE = 'penitrate',
}

export class Feet extends BodyPart {
    constructor(body: Body, entity: Entity) {
        super('feet', entity, body, feetTags)
    }
}
