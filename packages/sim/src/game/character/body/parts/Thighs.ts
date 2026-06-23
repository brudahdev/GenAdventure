import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const thighTags: Taggable = {
    tags: ['thigh', 'leg'],
    excludeTags: []
}

export class Thighs extends BodyPart {
    constructor(body: Body, entity: Entity) {
        super('thighs', entity, body, thighTags)
    }
}
