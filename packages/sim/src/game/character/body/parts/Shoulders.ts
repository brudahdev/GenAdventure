import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const shoulderTags: Taggable = {
    tags: ['shoulder'],
    excludeTags: []
}

export class Shoulders extends BodyPart {
    constructor(body: Body, entity: Entity) {
        super('shoulders', entity, body, shoulderTags)
    }
}
