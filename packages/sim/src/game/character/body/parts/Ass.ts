import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const assTags: Taggable =
{
    tags: ['butt', 'ass', 'cheek'],
    excludeTags: []
}

export class Ass extends BodyPart {
    constructor(body: Body, entity: Entity) {
        super('ass', entity, body, assTags)
    }
}
