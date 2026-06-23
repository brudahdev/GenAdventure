import { Taggable } from "@gen-adventure/shared"
import { BodyPart } from "../BodyPart"
import { Entity } from "../../../../core/ec/Entity"
import { Body } from "../Body"

export const titsTags: Taggable = {
    tags: ['tit', 'boob', 'breast', 'chest', 'knockers'],
    excludeTags: []
}

export enum TitsEffectSlots {
    TOUCH = 'touch',
    CLEAVAGE = 'cleavage',
}

export class Tits extends BodyPart {
    constructor(
        body: Body,
        entity: Entity
    ) {
        super(
            'tits',
            entity,
            body,
            titsTags
        )
    }
}