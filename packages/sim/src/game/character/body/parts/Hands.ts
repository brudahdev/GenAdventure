import { Taggable } from "@gen-adventure/shared"
import { BodyPart } from "../BodyPart"
import { Entity } from "../../../../core/ec/Entity"
import { Body } from "../Body"

export const handTags: Taggable = {
    tags: ['hand', 'finger', 'paw'],
    excludeTags: []
}

export const armTags: Taggable = {
    tags: ['arm'],
    excludeTags: []
}

export enum HandsEffectSlots {
    HOLD = 'hold',
}

export class Hands extends BodyPart {
    constructor(
        body: Body,
        entity: Entity
    ) {
        super(
            'hands',
            entity,
            body,
            handTags
        )
    }
}