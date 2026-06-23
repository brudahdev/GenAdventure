import { PLAYER_CHARACTER_ID, parseSaveDocument, SaveDocument, SimResumeData, SimStartData, validateSaveName, type VoxtaScenarioSummary } from '@gen-adventure/shared'


import { SimManager } from '../sim/SimManager'
import { container, singleton } from 'tsyringe'
import { VoxtaClient } from '../../integration/voxta/voxtaClient';
import { ChatService } from '../chat/ChatService';
import { CharacterService } from '../character/CharacterService';
import { CharacterActivationService } from '../character/CharacterActivationService';
import { AvatarService } from '../avatar/AvatarService';
import { BackgroundService } from '../background/BackgroundService';
import { OverlayService } from '../overlay/OverlayService';
import { SaveDataService } from '../save/SaveDataService';
import { absolutePath } from '../../integration/voxta/config/saveDataStore';



const voxtaClient = container.resolve(VoxtaClient);
const simManager = container.resolve(SimManager);
const chatService = container.resolve(ChatService)
const characterService = container.resolve(CharacterService)
const overlayService = container.resolve(OverlayService)
const saveDataService = container.resolve(SaveDataService)


@singleton()
export class ScenarioService {
  private current: VoxtaScenarioSummary | null = null

  constructor() { }

  async listScenarios(): Promise<VoxtaScenarioSummary[]> {
    return voxtaClient.listScenarios()
  }

  /** Start the sim and a fresh Voxta chat. Returns true only if both came up. */
  async startScenario(scenario: VoxtaScenarioSummary): Promise<boolean> {
    this.current = scenario

    // Drop any avatars/background from a previous scenario before the sim fires
    // fresh image requests. Resolved lazily here (not at module scope) so the
    // IMAGE_PROVIDER token has been registered by the time this call runs.
    container.resolve(AvatarService).clear()
    container.resolve(BackgroundService).clear()

    // Start the sim
    const simStartResult = await simManager.startSim(await this.buildStartData(scenario));

    if (!simStartResult.success) {
      characterService.clearScenarioRoster();
      return false
    }
    const sim = simManager.getSim()!;

    // Generate the background + active-character avatars from the sim's prompts.
    const npcIds = await this.generateSceneImages()

    // Start a fresh Voxta chat
    overlayService.show('Starting chat...')
    const characterIds = scenario.roles.map((role) => role.defaultCharacterId)
    const chatId = await voxtaClient.startChat(characterIds, undefined, scenario.id)//todo pass starting actions and context from sim response
    if (!chatId) {
      simManager.stopSim()
      return false
    }

    sim.setChatId(chatId)
    sim.onChatStarted();

    simManager.resumeTime()
    chatService.onChatStarted(chatId)

    // Reconcile Voxta participants against the sim's active set (drops roster
    // characters the sim hasn't activated). Resolved lazily (not at module scope)
    // so IMAGE_PROVIDER — pulled in transitively via AvatarService — is registered
    // by the time this runs.
    await container.resolve(CharacterActivationService).syncActiveCharacters(npcIds)

    overlayService.hide()
    return true
  }
  /**
   * Rebuild the sim from a saved `game.json` and reconnect to its Voxta chat.
   * Mirrors {@link startScenario} but provisions the sim from saved state and
   * resumes the existing chat (by id) rather than starting a fresh one.
   * `gameJsonPath` is relative under save_data: `saves/<scenarioId>/<saveName>/game.json`.
   * Returns true only if the sim and chat both came up.
   */
  async loadGame(gameJsonPath: string): Promise<boolean> {
    const raw = await saveDataService.read(gameJsonPath)
    if (!raw) {
      console.error(`[ScenarioService] save not found: ${gameJsonPath}`)
      return false
    }
    let saveData: SaveDocument
    try {
      saveData = parseSaveDocument(raw)
    } catch (e) {
      console.error(`[ScenarioService] unreadable save ${gameJsonPath}: ${e instanceof Error ? e.message : e}`)
      return false
    }
    const scenarioId = gameJsonPath.split('/')[1]

    const scenario = (await voxtaClient.listScenarios()).find((s) => s.id === scenarioId)
    if (!scenario) {
      console.error(`[ScenarioService] scenario ${scenarioId} for save no longer exists`)
      return false
    }
    this.current = scenario

    container.resolve(AvatarService).clear()
    container.resolve(BackgroundService).clear()

    // Resume the sim from the saved state.
    const resumeData: SimResumeData = {
      ...(await this.buildStartData(scenario)),
      saveData,
    }
    const simResult = await simManager.resumeSim(resumeData)
    if (!simResult.success) {
      characterService.clearScenarioRoster()
      return false
    }
    const sim = simManager.getSim()!

    // Regenerate the background + active-character avatars from the restored state.
    const npcIds = await this.generateSceneImages()

    // Resume the existing Voxta chat by id (keeps the conversation history).
    overlayService.show('Resuming chat...')
    const characterIds = scenario.roles.map((role) => role.defaultCharacterId)///todo use saved character id instead of default, and remember to filter out player.
    const chatId = await voxtaClient.startChat(characterIds, saveData.meta.chatId, scenario.id)
    if (!chatId) {
      simManager.stopSim()
      return false
    }

    sim.setChatId(chatId)
    sim.onChatStarted();


    simManager.resumeTime()
    chatService.onChatStarted(chatId)

    await container.resolve(CharacterActivationService).syncActiveCharacters(npcIds)

    overlayService.hide()
    return true
  }

  /** The sim boot payload built from on-disk config (shared by start + resume). */
  private async buildStartData(scenario: VoxtaScenarioSummary): Promise<SimStartData> {
    return {
      scenarioId: scenario.id,
      characters: await characterService.loadScenarioRoster(scenario),
      scenariosConfigDirectory: absolutePath('configs/scenarios'),
      charactersConfigDirectory: absolutePath('configs/characters'),
      appearanceConfigLocation: absolutePath('configs/appearance.json'),
      poseConfigLocation: absolutePath('configs/poses.json'),
      clothingItemConfigLocation: absolutePath('configs/clothing.json'),
      outfitConfigLocation: absolutePath('configs/outfit.json'),
      playerPersonaConfigLocation: absolutePath('configs/player_personas.json'),
      savesLocation: absolutePath(`saves/${scenario.id}`),
    }
  }

  /** Generate the background (player POV) and an avatar per active NPC from the
   *  running sim's prompts. Returns the active NPC ids. Shared by start + resume. */
  private async generateSceneImages(): Promise<string[]> {
    const sim = simManager.getSim()!

    //generate background
    //todo check if image gen is enabled
    const backgroundService = container.resolve(BackgroundService)
    overlayService.show('Generating background...')
    const startingBackgroundPrompt = await sim.getBackgroundPromptForCharacter(PLAYER_CHARACTER_ID)
    await backgroundService.handle(startingBackgroundPrompt)

    //handle active characters
    const avatarService = container.resolve(AvatarService)
    const npcIds = await sim.getActiveNpcs()
    for (const npcId of npcIds) {
      const name = characterService.getScenarioCharacterById(npcId)?.name
      overlayService.show(`Generating avatar for ${name ?? npcId}...`)
      const avatarPrompt = await sim.getAvatarPromptForCharacter(npcId)
      await avatarService.handle(avatarPrompt)
    }
    return npcIds
  }

  /** Tear down the running scenario: stop the Voxta chat and the sim. */
  async endScenario(): Promise<void> {
    await chatService.quit()
    simManager.stopSim()
    characterService.clearScenarioRoster()
    this.current = null
  }

  /** Persist the running sim to slot `slot` under the folder `saveName`. */
  async persist(saveName: string, slot: number): Promise<void> {
    const error = validateSaveName(saveName)
    if (error) {
      throw new Error(`Invalid save name: ${error}`)
    }
    await simManager.persist(saveName, slot)
  }

  

  roleNameForCharacterId(characterId: string): string | undefined {
    return this.current?.roles.find((role) => role.defaultCharacterId === characterId)?.roleName
  }
}
