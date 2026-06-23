import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const headTags: Taggable =
{
    tags: ['head'],
    excludeTags: []
}

export class Head extends BodyPart {
    constructor(body: Body, entity: Entity) {
        super('head', entity, body, headTags)
    }
}
