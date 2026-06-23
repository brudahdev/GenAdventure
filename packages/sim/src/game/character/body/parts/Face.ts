import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const faceTags: Taggable = {
    tags: ['face', 'cheeks', 'chin'],
    excludeTags: ['pussy']
}

export class Face extends BodyPart {
    constructor(body: Body, entity: Entity) {
        super('face', entity, body, faceTags)
    }
}
