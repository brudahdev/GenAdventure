[1mdiff --git a/packages/sim/src/game/character/clothing/ClothingInferenceAction.ts b/packages/sim/src/game/character/clothing/ClothingInferenceAction.ts[m
[1mindex 38b8fc7..107d67b 100644[m
[1m--- a/packages/sim/src/game/character/clothing/ClothingInferenceAction.ts[m
[1m+++ b/packages/sim/src/game/character/clothing/ClothingInferenceAction.ts[m
[36m@@ -1,6 +1,8 @@[m
[32m+[m[32mimport { container } from "tsyringe"[m
 import { ActionContent, arg, CharacterInferenceAction, InferredArgs, optional } from "../../../core/action-inference/CharacterInferenceAction"[m
 import { InferenceActionManager } from "../../../core/action-inference/InferenceActionManager"[m
 import { Entity } from "../../../core/ec/Entity"[m
[32m+[m[32mimport { CharacterSpawner } from "../../entity/CharacterSpawner"[m
 import { EventSystem } from "../../EventSystem"[m
 import { buildAvatarPrompt } from "../characterViews"[m
 import { CharacterIdentityKey } from "../identity/CharacterIdentity"[m
[36m@@ -21,9 +23,10 @@[m [mexport class ClothingInferenceAction extends CharacterInferenceAction<ClothingIn[m
     readonly args = clothingInferenceArgs[m
     private readonly characterName: string;[m
 [m
[32m+[m[32m    private characterSpawner?: CharacterSpawner;[m
 [m
     constructor([m
[31m-        private entity: Entity, [m
[32m+[m[32m        private entity: Entity,[m
         private eventSystem: EventSystem,[m
         manager: InferenceActionManager[m
     ) {[m
[36m@@ -52,8 +55,15 @@[m [mexport class ClothingInferenceAction extends CharacterInferenceAction<ClothingIn[m
 [m
     handle(args: InferredArgs<ClothingInferenceArgs>): void {[m
         console.log("ACTION CALLED: " + JSON.stringify(args))[m
[31m-        // todo subjectName[m
[31m-        const targetEntity = this.entity[m
[32m+[m[32m        if (!this.characterSpawner) {[m
[32m+[m[32m            this.characterSpawner = container.resolve(CharacterSpawner)[m
[32m+[m[32m        }[m
[32m+[m[32m        const targetData = this.characterSpawner.getTargetCharacter(args.subjectName, this.entity)[m
[32m+[m[32m        if (!targetData) {[m
[32m+[m[32m            console.log("unable to find target character with name " + args.subjectName)[m
[32m+[m[32m            return;[m
[32m+[m[32m        }[m
[32m+[m[32m        const targetEntity = targetData.target[m
 [m
 [m
         const clothingItem = targetEntity.require(ClothingManagerKey).getClothingItemByTag(args.clothingName)[m
[36m@@ -70,6 +80,6 @@[m [mexport class ClothingInferenceAction extends CharacterInferenceAction<ClothingIn[m
 [m
         clothingItem.setStateById(state.id)[m
 [m
[31m-        this.eventSystem.emit("image.request",buildAvatarPrompt(targetEntity) )[m
[32m+[m[32m        this.eventSystem.emit("image.request", buildAvatarPrompt(targetEntity))[m
     }[m
 }[m
\ No newline at end of file[m
[1mdiff --git a/packages/sim/src/game/entity/CharacterSpawner.ts b/packages/sim/src/game/entity/CharacterSpawner.ts[m
[1mindex 9713bb0..1e014a3 100644[m
[1m--- a/packages/sim/src/game/entity/CharacterSpawner.ts[m
[1m+++ b/packages/sim/src/game/entity/CharacterSpawner.ts[m
[36m@@ -8,7 +8,7 @@[m [mimport { EntityRegistry } from "./EntityRegistry";[m
 import { INIT_CHARACTERS } from "./initCharacters";[m
 import { RUN_CONTAINER } from "../../core/provision/runContainer";[m
 import { NpcActivityKey, npcActivityFactory } from "../character/npc/NpcActivity";[m
[31m-import { playerIdentityFactory, npcIdentityFactory } from "../character/identity/CharacterIdentity";[m
[32m+[m[32mimport { playerIdentityFactory, npcIdentityFactory, CharacterIdentityKey } from "../character/identity/CharacterIdentity";[m
 import { playerMarkerFactory } from "../character/player/PlayerControlled";[m
 import { characterLocationFactory } from "../character/location/CharacterLocation";[m
 import { characterPoseFactory } from "../character/pose/CharacterPose";[m
[36m@@ -47,7 +47,9 @@[m [mconst NPC_BLUEPRINT: ComponentFactory[] = [[m
 @scoped(Lifecycle.ContainerScoped)[m
 export class CharacterSpawner implements GameSystem {[m
     // Insertion order matters: the player first, then NPCs in init order.[m
[31m-    private readonly characters: Entity[] = [];[m
[32m+[m[32m    // private readonly characters: Entity[] = [];[m
[32m+[m[32m    private readonly characterMap = new Map<string, Entity>();[m
[32m+[m[32m    private readonly characterNameMap = new Map<string, Entity>();[m
 [m
     constructor([m
         @inject(INIT_CHARACTERS) initCharacters: SimStartCharacterData[],[m
[36m@@ -66,14 +68,14 @@[m [mexport class CharacterSpawner implements GameSystem {[m
     /** Emits every character's initial state events (in insertion order, player[m
      *  first), once the whole run graph is constructed. */[m
     init(): void {[m
[31m-        for (const character of this.characters) {[m
[32m+[m[32m        for (const character of this.characterMap.values()) {[m
             character.init()[m
             this.eventSystem.emit("character.initialized", { characterId: character.id })[m
         }[m
     }[m
 [m
     dispose(): void {[m
[31m-        for (const character of this.characters) {[m
[32m+[m[32m        for (const character of this.characterMap.values()) {[m
             character.dispose()[m
         }[m
     }[m
[36m@@ -82,12 +84,38 @@[m [mexport class CharacterSpawner implements GameSystem {[m
         return this.registry.with(NpcActivityKey).filter(entity => entity.require(NpcActivityKey).isActive)[m
     }[m
 [m
[32m+[m[32m    getCharacterByName(name: string) {[m
[32m+[m[32m        return this.characterNameMap.get(name)[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    ///used to fetch a character by name provided by llm[m
[32m+[m[32m    getTargetCharacter(targetCharacterName: string, calledBy: Entity): { target: Entity, isActingOnSelf: boolean } | undefined {[m
[32m+[m[32m        const isActingOnSelf = targetCharacterName === calledBy.require(CharacterIdentityKey).name || targetCharacterName == 'self';[m
[32m+[m[32m        if (isActingOnSelf) {[m
[32m+[m[32m            return {[m
[32m+[m[32m                target: calledBy,[m
[32m+[m[32m                isActingOnSelf: true[m
[32m+[m[32m            }[m
[32m+[m[32m        }[m
[32m+[m[32m        const target = this.getCharacterByName(targetCharacterName)[m
[32m+[m[32m        if (!target) {[m
[32m+[m[32m            return undefined[m
[32m+[m[32m        }[m
[32m+[m
[32m+[m[32m        return {[m
[32m+[m[32m            target: target,[m
[32m+[m[32m            isActingOnSelf: false[m
[32m+[m[32m        }[m
[32m+[m[32m    }[m
[32m+[m
     private spawn(characterId: string, blueprint: ComponentFactory[]): void {[m
         const entity = new Entity(characterId)[m
         for (const factory of blueprint) {[m
             factory.attach(entity, this.container)[m
         }[m
         this.registry.register(entity)[m
[31m-        this.characters.push(entity)[m
[32m+[m
[32m+[m[32m        this.characterMap.set(entity.id, entity)[m
[32m+[m[32m        this.characterNameMap.set(entity.require(CharacterIdentityKey).name, entity)[m
     }[m
 }[m
