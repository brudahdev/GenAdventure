import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const mouthTags: Taggable =
{
    tags: ['mouth', 'lip', 'tongue', 'teeth'],
    excludeTags: ['pussy']
}

export const tongueTags: Taggable = {
    tags: ['tongue', ...mouthTags.tags],
    excludeTags: []
}

export enum MouthEffectSlots {
    PENITRATE = 'PENITRATE',
}

export class Mouth extends BodyPart {
    constructor(body: Body, entity: Entity) {
        super('mouth', entity, body, mouthTags)
    }
}
