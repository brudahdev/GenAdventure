import 'reflect-metadata'
import { parentPort } from 'worker_threads'
import * as path from 'path'
import * as Comlink from 'comlink'
import type { Remote } from 'comlink'
import type {
  MainApi, PromptRequest, SimApi, SimResumeData, SimStartData, SimStartResult, InferenceInvocation, TouchOptions
} from '@gen-adventure/shared'
import { nodeEndpoint, PLAYER_CHARACTER_ID } from '@gen-adventure/shared'
import { container, type DependencyContainer } from 'tsyringe'
import { SimProvisioner } from './core/provision/SimProvisioner'
import { SimWorld } from './game/SimWorld'
import { buildAvatarPrompt } from './game/character/characterViews'
import { alterClothingStateIntent } from "./game/character/clothing/behavior/AlterClothingStateIntent"
import { CharacterPoseKey } from './game/character/pose/CharacterPose'
import { CharacterLocation, CharacterLocationKey } from './game/character/location/CharacterLocation'
import { CharacterLocomotionKey } from './game/character/locomotion/CharacterLocomotion'
import { NpcActivityKey } from './game/character/npc/NpcActivity'
import { poseIntent } from './game/character/pose/behavior/PoseIntent'
import { goToIntent } from './game/character/locomotion/behavior/GoToIntent'
import { touchIntent } from './game/character/body/touch/behavior/TouchIntent'

/** The worker's implementation of the surface the main process calls. Each run
 *  gets its own child container (provisioned with a mode-specific adapter set)
 *  and a fresh `SimWorld`, so runs stay isolated — starting a new run disposes
 *  the previous world and its scope. The service itself is a thin delegate. */
class SimService implements SimApi {
  private world: SimWorld | null = null
  private scope: DependencyContainer | null = null
  private savesLocation: string | null = null
  private chatId: string | null = null

  constructor(private readonly main: Remote<MainApi>) { }

  async start(initData: SimStartData): Promise<SimStartResult> {
    console.log(
      `[sim] START scenario ${initData.scenarioId} with ${initData.characters.length} character(s)`
    )

    this.savesLocation = initData.savesLocation
    // A fresh run has no chat yet; drop any id left over from a previous run.
    this.chatId = null
    this.bootWorld(new SimProvisioner(initData, this.main, null))

    return { success: true }
  }

  async resume(resumeData: SimResumeData): Promise<SimStartResult> {
    console.log(
      `[sim] RESUME scenario ${resumeData.scenarioId} (chat ${resumeData.saveData.meta.chatId}) ` +
      `with ${resumeData.characters.length} character(s)`
    )

    this.savesLocation = resumeData.savesLocation
    // The resumed chat keeps its id, so persist() works without a separate setChatId.
    this.chatId = resumeData.saveData.meta.chatId
    this.bootWorld(new SimProvisioner(resumeData, this.main, resumeData.saveData))

    return { success: true }
  }

  /** Disposes any previous run (stops its time interval, drops listeners),
   *  then provisions a fresh child container and resolves a new world. */
  private bootWorld(provisioner: SimProvisioner): void {
    this.world?.dispose()
    void this.scope?.dispose()

    this.scope = container.createChildContainer()
    provisioner.provision(this.scope)
    this.world = this.scope.resolve(SimWorld)
    this.world.init()
  }

  setChatId(chatId: string): void {
    this.chatId = chatId
  }

  async persist(saveName: string, slot: number): Promise<void> {
    if (!this.savesLocation || !this.chatId) {
      throw new Error('persist() called before setChatId()')
    }
    this.getWorld().persist(path.join(this.savesLocation, saveName), this.chatId, slot)
  }

  async getBackgroundPromptForCharacter(characterId: string): Promise<PromptRequest> {
    return this.getWorld().getBackgroundPromptForCharacter(characterId)
  }

  async getActiveNpcs(): Promise<string[]> {
    return this.getWorld().getActiveNpcs()
  }

  async getAvatarPromptForCharacter(characterId: string): Promise<PromptRequest> {
    return this.getWorld().getAvatarPromptForCharacter(characterId)
  }

  async getTouchOptions(characterId: string): Promise<TouchOptions> {
    return this.getWorld().getTouchOptions(characterId)
  }

  timeResume(): void {
    this.world?.timeResume()
  }

  timePause(): void {
    this.world?.timePause()
  }

  clothingStateChangeUiAction(characterId: string, clothingItemId: string, stateId: string): void {
    console.log('[sim] clothingStateChangeUiAction', characterId, clothingItemId, stateId)

    const targetEntity = this.world?.registry.getById(characterId)
    if (!targetEntity) {
      console.log(`[sim] unable to get character with id ${characterId}`)
      return;
    }


    // Avatar regeneration stays in the handler, now deferred to the tree settling
    // (gated on success + NPC active).
    this.getWorld().submitIntent(
      alterClothingStateIntent(PLAYER_CHARACTER_ID, characterId, clothingItemId, stateId),
      (success) => {
        if (success && characterId != PLAYER_CHARACTER_ID && targetEntity.require(NpcActivityKey).isActive) {
          main.imageRequest(buildAvatarPrompt(targetEntity))
        }
      },
    )
  }

  moveUiAction(
    characterId: string,//playerId if the user is moving themselves, otherwise id of an npc
    locationId: string,
  ) {
    //todo action layer, decomposition, etc. not now though


    const targetEntity = this.world?.registry.getById(characterId);
    if (!targetEntity) {
      console.log(`[sim] unable to get character with id ${characterId}`)
      return;
    }

    let targetLocation = this.world?.locationManager.getLocationById(locationId);
    let targetSubLocation = undefined;
    if (!targetLocation) {
      targetLocation = this.world?.registry.requireById(PLAYER_CHARACTER_ID).require(CharacterLocationKey).getCurrentLocation();
      targetSubLocation = locationId;
    }



    this.getWorld().submitIntent(
      goToIntent(characterId, targetLocation!.id, targetSubLocation),
      (success) => {
        if (success && characterId != PLAYER_CHARACTER_ID && targetEntity.require(NpcActivityKey).isActive) {
          main.imageRequest(buildAvatarPrompt(targetEntity))
        }
      },
    )
  }

  poseUiAction(
    characterId: string,//playerId if the user is posing themselves, otherwise id of an npc
    poseId: string,
  ) {
    const targetEntity = this.world?.registry.getById(characterId);
    if (!targetEntity) {
      console.log(`[sim] unable to get character with id ${characterId}`)
      return;
    }

    const targetposeManager = targetEntity.require(CharacterPoseKey)
    const targetPoseId = poseId


    this.getWorld().submitIntent(
      poseIntent(PLAYER_CHARACTER_ID, characterId, targetPoseId),
      (success) => {
        if (success && characterId != PLAYER_CHARACTER_ID && targetEntity.require(NpcActivityKey).isActive) {
          main.imageRequest(buildAvatarPrompt(targetEntity))
        }
      },
    )
  }

  touchUiAction(
    characterId: string,//playerId if the user is touching themselves, otherwise id of an npc
    targetId: string,
    withId: string,
    verbId: string,
  ) {
    const targetEntity = this.world?.registry.getById(characterId);
    if (!targetEntity) {
      console.log(`[sim] unable to get character with id ${characterId}`)
      return;
    }
    
    this.getWorld().submitIntent(
      touchIntent(
        PLAYER_CHARACTER_ID,
        characterId,
        withId,
        targetId,
        verbId,
      ),
      (success) => {
        if (success && characterId != PLAYER_CHARACTER_ID && targetEntity.require(NpcActivityKey).isActive) {
          main.imageRequest(buildAvatarPrompt(targetEntity))
        }
      },
    )
  }

  private getWorld(): SimWorld {
    if (!this.world) {
      throw new Error('sim has not been started')
    }
    return this.world
  }
  onChatStarted() {
    this.world?.contextManager.pushInitaialContext();
    this.world?.inferenceActionManager.pushInitialActions();
  }

  onInvocation(invocation: InferenceInvocation): void {
    void this.getWorld().inferenceActionManager.onInvocation(invocation)
  }
}

const endpoint = nodeEndpoint(parentPort!)
const main = Comlink.wrap<MainApi>(endpoint)
Comlink.expose(new SimService(main), endpoint)
