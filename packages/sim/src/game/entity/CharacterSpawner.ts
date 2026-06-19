import { inject, Lifecycle, scoped, type DependencyContainer } from "tsyringe";
import { PLAYER_CHARACTER_ID, type SimStartCharacterData } from "@gen-adventure/shared";
import type { GameSystem } from "../../core/GameSystem";
import type { ComponentFactory } from "../../core/ec/ComponentFactory";
import { Entity } from "../../core/ec/Entity";
import { EventSystem } from "../EventSystem";
import { EntityRegistry } from "./EntityRegistry";
import { INIT_CHARACTERS } from "./initCharacters";
import { RUN_CONTAINER } from "../../core/provision/runContainer";
import { NpcActivityKey, npcActivityFactory } from "../character/npc/NpcActivity";
import { playerIdentityFactory, npcIdentityFactory } from "../character/identity/CharacterIdentity";
import { playerMarkerFactory } from "../character/player/PlayerControlled";
import { characterLocationFactory } from "../character/location/CharacterLocation";
import { characterPoseFactory } from "../character/pose/CharacterPose";
import { appearanceFactory } from "../character/appearance/CharacterAppearance";
import { clothingFactory } from "../character/clothing/ClothingManager";
import { characterLocomotionFactory } from "../character/locomotion/CharacterLocomotion";

/** A blueprint is just an ordered list of component factories. Component order
 *  matters: factories that `require()` a sibling at attach time (identity) or
 *  whose components emit/react in a set order must come first. Adding an aspect
 *  to characters = write a component + its `defineFactory` const and append it here. */
const PLAYER_BLUEPRINT: ComponentFactory[] = [
    playerIdentityFactory,
    playerMarkerFactory,
    characterLocationFactory,
    characterLocomotionFactory,
    characterPoseFactory,
    appearanceFactory,
    clothingFactory,
]
const NPC_BLUEPRINT: ComponentFactory[] = [
    npcIdentityFactory,
    characterLocationFactory,
    npcActivityFactory,
    characterLocomotionFactory,
    characterPoseFactory,
    appearanceFactory,
    clothingFactory,
]

/** Assembles the run's characters and registers them into the shared
 *  {@link EntityRegistry}. Owns everything character-specific that the generic
 *  registry sheds: blueprints, factory resolution, the two-phase init that emits
 *  `character.initialized`, and the character-scoped queries. Future entity
 *  kinds get their own spawner registering into the same registry. */
@scoped(Lifecycle.ContainerScoped)
export class CharacterSpawner implements GameSystem {
    // Insertion order matters: the player first, then NPCs in init order.
    private readonly characters: Entity[] = [];

    constructor(
        @inject(INIT_CHARACTERS) initCharacters: SimStartCharacterData[],
        @inject(RUN_CONTAINER) private readonly container: DependencyContainer,
        private readonly registry: EntityRegistry,
        private readonly eventSystem: EventSystem,
    ) {
        this.spawn(PLAYER_CHARACTER_ID, PLAYER_BLUEPRINT)

        for (const { characterId } of initCharacters) {
            if (characterId === PLAYER_CHARACTER_ID) continue
            this.spawn(characterId, NPC_BLUEPRINT)
        }
    }

    /** Emits every character's initial state events (in insertion order, player
     *  first), once the whole run graph is constructed. */
    init(): void {
        for (const character of this.characters) {
            character.init()
            this.eventSystem.emit("character.initialized", { characterId: character.id })
        }
    }

    dispose(): void {
        for (const character of this.characters) {
            character.dispose()
        }
    }

    getActiveNpcs(): Entity[] {
        return this.registry.with(NpcActivityKey).filter(entity => entity.require(NpcActivityKey).isActive)
    }

    private spawn(characterId: string, blueprint: ComponentFactory[]): void {
        const entity = new Entity(characterId)
        for (const factory of blueprint) {
            factory.attach(entity, this.container)
        }
        this.registry.register(entity)
        this.characters.push(entity)
    }
}
