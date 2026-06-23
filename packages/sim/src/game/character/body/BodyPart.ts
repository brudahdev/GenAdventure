import { Taggable } from "@gen-adventure/shared";
import { Entity } from "../../../core/ec/Entity";
import { Body } from "./Body";
import { TouchInteractionSlot } from "./touch/TouchSlot";
import { TouchInteraction } from "./touch/Touch";
import { PromptBuilder } from "../../../core/PromptBuilder";

export class BodyPart implements Taggable {
    // protected character: Character;
    private slots: Record<string, TouchInteractionSlot<TouchInteraction>> = {};

    constructor(
        protected readonly connonicalName: string,
        protected readonly entity: Entity,
        protected readonly body: Body,
        protected readonly taggable: Taggable
    ) {
        body.addPart(this)
    }

    get tags() {
        return this.taggable.tags
    }

    get excludeTags() {
        return this.taggable.excludeTags
    }

    getAllSlots() {
        return Object.values(this.slots);
    }

    getSlot(name: string = 'default'): TouchInteractionSlot<TouchInteraction> {
        if (!this.slots[name]) {
            this.slots[name] = new TouchInteractionSlot<TouchInteraction>(this.connonicalName, name);
        }
        return this.slots[name];
    }

    slotContains(slotName: string, interaction: TouchInteraction) {
        const slot = this.getSlot(slotName);
        return slot.slotContains(interaction);
    }

    appendBodyPrompt(prompt: PromptBuilder) {}

}