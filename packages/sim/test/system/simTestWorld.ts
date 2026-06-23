import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { Remote } from 'comlink'
import { container, type DependencyContainer } from 'tsyringe'
import { vi } from 'vitest'
import {
  PLAYER_CHARACTER_ID,
  type MainApi,
  type SaveDocument,
  type SimResumeData,
  type SimStartData,
} from '@gen-adventure/shared'
import { SimProvisioner } from '../../src/core/provision/SimProvisioner'
import { SimWorld } from '../../src/game/SimWorld'
import type { Entity } from '../../src/core/ec/Entity'

/** Full game context lives next to the tests, copied from `configs_backup`. */
export const CONFIGS = path.join(__dirname, 'configs')
export const SCENARIO_ID = '4b3978cf-6038-269e-b717-d71d39298fbe'

/** Two NPC roles from this scenario's roles.json (player role -1 is added by the
 *  sim internally). */
export const NPC_A = '67e139a4-e30e-4603-a083-6e89719a9bb1'
export const NPC_B = '0c1adcf7-7c79-8090-0a01-c79901f6753f'

export { PLAYER_CHARACTER_ID }

/** The sim only touches the remote on a time tick (`resume()`), which these tests
 *  never trigger, so a stub is enough. Superset of the methods the system tests
 *  exercise. */
const main = {
  gameTime: vi.fn(),
  imageRequest: vi.fn(),
  clothingStateOptions: vi.fn(),
} as unknown as Remote<MainApi>

/** Standard 2-NPC start data wired to the shared config fixture, with a
 *  caller-supplied temp `savesLocation`. `overrides` lets a test tweak the
 *  roster or any path. */
function buildStartData(savesLocation: string, overrides?: Partial<SimStartData>): SimStartData {
  return {
    scenarioId: SCENARIO_ID,
    characters: [
      { name: 'NpcA', roleOrder: 0, characterId: NPC_A },
      { name: 'NpcB', roleOrder: 1, characterId: NPC_B },
    ],
    scenariosConfigDirectory: path.join(CONFIGS, 'scenarios'),
    charactersConfigDirectory: path.join(CONFIGS, 'characters'),
    appearanceConfigLocation: path.join(CONFIGS, 'appearance.json'),
    poseConfigLocation: path.join(CONFIGS, 'poses.json'),
    clothingItemConfigLocation: path.join(CONFIGS, 'clothing.json'),
    outfitConfigLocation: path.join(CONFIGS, 'outfit.json'),
    savesLocation,
    ...overrides,
  }
}

/** A booted sim run plus the handles a test usually reaches for. One per `it`. */
export interface SimTestWorld {
  world: SimWorld
  scope: DependencyContainer
  /** The player entity (PlayerControlled marker). */
  player: Entity
  /** Every character minus the player, in spawn order. */
  npcs: Entity[]
  /** Fresh temp directory backing this run's saves. */
  savesLocation: string
  /** Pump the behaviour-tree runner (these tests never start the real time
   *  interval) until every actor's tree has settled, or `maxTicks` is hit.
   *  Returns the number of ticks taken. */
  runBehaviors(maxTicks?: number): number
  /** Tears down the run and removes the temp save directory. */
  dispose(): void
}

/** Boots a fresh world from the provisioned scope and packages it as a
 *  {@link SimTestWorld}. Mirrors `SimService`: child container → provision →
 *  resolve(SimWorld) → init(). */
function boot(savesLocation: string, provision: (scope: DependencyContainer) => void): SimTestWorld {
  const scope = container.createChildContainer()
  provision(scope)
  const world = scope.resolve(SimWorld)
  world.init()

  const player = world.registry.getById(PLAYER_CHARACTER_ID)
  if (!player) {
    throw new Error('player entity was not spawned')
  }
  const npcs = world.registry.all().filter((entity) => entity.id !== PLAYER_CHARACTER_ID)

  return {
    world,
    scope,
    player,
    npcs,
    savesLocation,
    runBehaviors(maxTicks = 64) {
      let ticks = 0
      while (!world.behaviorRunner.allIdle() && ticks < maxTicks) {
        world.behaviorRunner.stepAll()
        ticks++
      }
      return ticks
    },
    dispose() {
      world.dispose()
      fs.rmSync(savesLocation, { recursive: true, force: true })
    },
  }
}

/** Reads back a persisted `game.json` as a {@link SaveDocument}. */
export function readSave(savesLocation: string, saveName: string): SaveDocument {
  const gamePath = path.join(savesLocation, saveName, 'game.json')
  return JSON.parse(fs.readFileSync(gamePath, 'utf-8')) as SaveDocument
}

/** A persisted entity's component blob by component key, typed by the caller. */
export function componentBlob<T>(doc: SaveDocument, entityId: string, keyId: string): T {
  const entity = doc.entities.find((e) => e.id === entityId)
  if (!entity) throw new Error(`no saved entity ${entityId}`)
  return entity.components[keyId] as T
}

/** Boots a new world from scenario config (the `start` path). */
export function startSimWorld(overrides?: Partial<SimStartData>): SimTestWorld {
  const savesLocation = fs.mkdtempSync(path.join(os.tmpdir(), 'genadv-sim-'))
  const startData = buildStartData(savesLocation, overrides)
  return boot(savesLocation, (scope) => new SimProvisioner(startData, main, null).provision(scope))
}

/** Boots a new world from a saved {@link SaveDocument} (the `resume` path). */
export function resumeSimWorld(saveData: SaveDocument, overrides?: Partial<SimStartData>): SimTestWorld {
  const savesLocation = fs.mkdtempSync(path.join(os.tmpdir(), 'genadv-sim-'))
  const resumeData: SimResumeData = { ...buildStartData(savesLocation, overrides), saveData }
  return boot(savesLocation, (scope) => new SimProvisioner(resumeData, main, saveData).provision(scope))
}
