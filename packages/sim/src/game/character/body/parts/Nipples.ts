import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const nippleTags: Taggable = {
    tags: ['nippl', 'nub'],
    excludeTags: []
}

export class Nipples extends BodyPart {
    constructor(body: Body, entity: Entity) {
        super('nipples', entity, body, nippleTags)
    }
}
