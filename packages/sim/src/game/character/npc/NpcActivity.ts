import { PLAYER_CHARACTER_ID } from "@gen-adventure/shared"
import type { Component } from "../../../core/ec/Component"
import type { Entity } from "../../../core/ec/Entity"
import { EventSystem } from "../../EventSystem"
import { CharacterLocationKey } from "../location/CharacterLocation"
import { defineKey } from "../../../core/ec/ComponentKey"
import { defineFactory } from "../../../core/ec/ComponentFactory"

/** Tracks whether an npc is co-located with the player (i.e. currently "active"
 *  in the Voxta chat). Replaces the active-state logic that lived on the `Npc`
 *  subclass; the player entity simply doesn't get this component. */
export const NpcActivityKey = defineKey<NpcActivity>("character.npcActivity")

export class NpcActivity implements Component {
    private active = false

    constructor(private readonly entity: Entity, eventSystem: EventSystem) {
        eventSystem.on("location.changed", (args) => {
            if (args.characterId === this.entity.id || args.characterId === PLAYER_CHARACTER_ID) {
                this.updateActiveState()
            }
        })
    }

    /** Second boot phase: resolves initial activity once every character has
     *  been placed. */
    init(): void {
        this.updateActiveState()
    }

    get isActive(): boolean {
        return this.active
    }

    private updateActiveState(): void {
        // active if at the same location as the player
        this.setActive(this.entity.require(CharacterLocationKey).isAtSameLocationAsOther(PLAYER_CHARACTER_ID))
    }

    private setActive(value: boolean): void {
        if (this.active === value) return
        this.active = value
        console.log(value ? "ACTIVE " + this.entity.id : "NOT ACTIVE " + this.entity.id)
    }
}

export const npcActivityFactory = defineFactory(NpcActivityKey, (entity, c) =>
    new NpcActivity(entity, c.resolve(EventSystem)))

