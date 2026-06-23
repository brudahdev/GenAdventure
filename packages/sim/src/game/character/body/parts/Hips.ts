import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../../core/ec/Entity";
import { BodyPart } from "../BodyPart";
import { Body } from "../Body";

export const hipTags: Taggable = {
    tags: ['hip', 'pelvis'],
    excludeTags: []
}

export class Hips extends BodyPart {
    constructor(body: Body, entity: Entity) {
        super('hips', entity, body, hipTags)
    }
}
