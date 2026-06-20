import type { SimStartData, SimResumeData, SimStartResult, SimContextItem } from './sim-messages'
import type { PromptRequest } from './imageGeneration'
import type { ClothingStateChangeOptionsSummary } from './clothing'
import type { NearbyLocationSummary } from './location'
import type { TouchOptions } from './touch'
import type { NpcActivationChange } from './npc'
import type { InferenceAction, InferenceInvocation } from './inference'

// The worker and main process talk over Comlink as if calling each other's
// methods. Each side `expose()`s its own implementation and `wrap()`s a typed
// proxy of the other; Comlink's `Remote<T>` makes every method async, so the
// caller just `await`s the return value — no string message names, no manual
// request/response correlation.

/** The sim worker's surface, called from the main process. */
export interface SimApi {
  /** Boot a scenario; resolves once the worker has initialised. */
  start(data: SimStartData): Promise<SimStartResult>
  /** Boot a scenario from a saved game (restores time + character state). */
  resume(data: SimResumeData): Promise<SimStartResult>
  timePause(): void
  timeResume(): void

  getBackgroundPromptForCharacter(characterId: string): Promise<PromptRequest>

  getActiveNpcs(): Promise<string[]>

  getAvatarPromptForCharacter(characterId: string): Promise<PromptRequest>

  /** Tell the worker which Voxta chat session is active, so it can be embedded in saves. */
  setChatId(chatId: string): void
  /** Snapshot game state to saves/<scenarioId>/<saveName>/game.json (chatId + slot embedded). */
  persist(saveName: string, slot: number): Promise<void>
  /** UI-requested clothing state change for a character's item. */
  clothingStateChangeUiAction(characterId: string, clothingItemId: string, stateId: string): void
  /** UI-requested move of a character to a nearby location. */
  moveUiAction(characterId: string, locationId: string): void
  /** UI-requested pose change for a character. */
  poseUiAction(characterId: string, poseId: string): void
  /** UI-requested touch interaction performed by a character. */
  touchUiAction(characterId: string, targetId: string, withId: string, verbId: string): void
  pushInitaialContext(): void,
  /** An inference action fired by Voxta, routed to the run's InferenceActionManager. */
  onInvocation(invocation: InferenceInvocation): void,
}

/** The main process's surface, called from the sim worker. */
export interface MainApi {
  /** Request image generation, routed to `ImageGenerationService`. */
  imageRequest(req: PromptRequest): void
  /** Push the current game time up to the renderer. */
  gameTime(timeMs: number): void
  /** Push a character's current clothing state-change options up to ClothingService. */
  clothingStateOptions(characterId: string, options: ClothingStateChangeOptionsSummary[]): void,
  /** Push a character's current nearby-location options up to LocationService. */
  locationOptions(characterId: string, options: NearbyLocationSummary): void,
  /** Push a character's current available pose options up to PoseService. */
  poseOptions(characterId: string, options: string[]): void,
  /** Push a character's current available touch options up to TouchService. */
  touchOptions(characterId: string, options: TouchOptions): void,

  /** An NPC became active/inactive (co-located with the player). Drives Voxta
   *  participant add/remove and avatar generation/removal. */
  npcActivationChanged(change: NpcActivationChange): void,
  /** The player changed location; the background should be regenerated. */
  backgroundChanged(): void,

  syncContext(context: SimContextItem): void,

  /** Push an inference action's current definition up so main can register it
   *  with Voxta. */
  syncAction(action: InferenceAction): void,
}
