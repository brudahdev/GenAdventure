import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const neckTags: Taggable = {
    tags: ['neck', 'throat'],
    excludeTags: []
}

export class Neck extends BodyPart {
    constructor(body: Body, entity: Entity) {
        super('neck', entity, body, neckTags)
    }
}
