import { PLAYER_CHARACTER_ID } from "@gen-adventure/shared"
import type { Component } from "../../../core/ec/Component"
import type { Entity } from "../../../core/ec/Entity"
import { EventSystem } from "../../EventSystem"
import { CharacterLocation, CharacterLocationKey } from "../location/CharacterLocation"
import { defineKey } from "../../../core/ec/ComponentKey"
import { defineFactory } from "../../../core/ec/ComponentFactory"

/** Tracks whether an npc is co-located with the player (i.e. currently "active"
 *  in the Voxta chat). Replaces the active-state logic that lived on the `Npc`
 *  subclass; the player entity simply doesn't get this component. */
export const NpcActivityKey = defineKey<NpcActivity>("character.npcActivity")

export class NpcActivity implements Component {
    private active = false

    private charLocation: CharacterLocation;

    constructor(private readonly entity: Entity, private eventSystem: EventSystem) {
        this.charLocation = this.entity.require(CharacterLocationKey);
        eventSystem.on("location.changed", (args) => {
            if (args.characterId === this.entity.id || args.characterId === PLAYER_CHARACTER_ID) {
                const useFade = args.characterId === this.entity.id
                this.updateActiveState(true, useFade)
            }
        })
    }

    /** Second boot phase: resolves initial activity once every character has
     *  been placed. */
    init(): void {
        this.updateActiveState(false, false)
    }

    get isActive(): boolean {
        return this.active
    }

    private updateActiveState(emit: boolean, useFade: boolean): void {
        // active if at the same location as the player
        const shouldBeActive = this.charLocation.isAtSameLocationAsOther(PLAYER_CHARACTER_ID)

        this.setActive(shouldBeActive, emit, useFade)
    }

    private setActive(value: boolean, emit: boolean, useFade: boolean): void {
        if (this.active === value) return
        this.active = value

        if (emit) {

            this.eventSystem.emit("npc.activation.changed", {
                characterId: this.entity.id,
                isActive: this.active,
                useFade
            })
        }
    }
}

export const npcActivityFactory = defineFactory(NpcActivityKey, (entity, c) =>
    new NpcActivity(entity, c.resolve(EventSystem)))