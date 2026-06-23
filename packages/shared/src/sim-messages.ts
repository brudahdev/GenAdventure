import type { ScenarioCharacter } from './voxta'

/** Payload handed to the sim worker to boot a scenario. Each character carries
 *  its `characterId` (identity) and `roleOrder` (join key into `roles.json`);
 *  `name` is the fetched character's persona name. */
export interface SimStartData {
  scenarioId: string,
  characters: SimStartCharacterData[],
  scenariosConfigDirectory: string,
  charactersConfigDirectory: string,
  appearanceConfigLocation: string,
  poseConfigLocation: string,
  clothingItemConfigLocation: string,
  outfitConfigLocation: string,
  playerPersonaConfigLocation: string,
  savesLocation: string,
}

export interface SimStartCharacterData {
  name: string
  roleOrder: number
  characterId: string
}

export interface SimResumeData extends SimStartData {
  /** The loaded, migrated save document to restore the run from. */
  saveData: SaveDocument
}

export interface TimeConfig {
  useCurrentTime: boolean
  am: boolean
  minute: number
  hour: number
  day: number
  month: number
  year: number
}

/** A single piece of initial sim context, scoped to a set of characters by their
 *  `characterId`. */
export interface SimContextItem {
  key: string
  value: string
  characterIds?: string[]
}

// --- Legacy v1 save shape (input to the v1→v2 migration in saveCodec) ----------

/** @deprecated v1 per-character save row. Read only by the v1→v2 migration. */
export interface CharacterSaveState {
  characterId: string
  locationId: string
  subLocationId: string
  poseId: string
  clothingItemIds: string[]
}

/** @deprecated v1 on-disk save shape. Read only by the v1→v2 migration. */
export interface SimSaveData {
  version: 1
  /** The Voxta chat session this save belongs to (was the save folder name). */
  chatId: string
  /** The numbered save slot (1..10) this save occupies within its scenario. */
  slot: number
  gameTimeMs: number
  characters: CharacterSaveState[]
}

// --- Current save document (v2+) ----------------------------------------------

/** One entity's persisted state: a bag of component blobs keyed by the
 *  component's `ComponentKey.id` (e.g. `"character.pose"`). A component that
 *  implements the sim's `Saveable` capability contributes one entry; pure-config
 *  components contribute nothing and are recomputed on load. */
export interface EntitySnapshot {
  id: string
  components: Record<string, unknown>
}

/** Listing-facing summary of a save, denormalized into `manifest.json` so the
 *  save picker never parses the (growing) body. Also embedded in the body. */
export interface SaveMeta {
  /** The Voxta chat session this save belongs to. */
  chatId: string
  /** The numbered save slot (1..10) this save occupies within its scenario. */
  slot: number
  /** Wall-clock ms when the save was written. */
  savedAt: number
  /** In-game time (ms) at save, for display in the picker. */
  gameTimeMs: number
}

/** The full save body (`game.json`). The sole structured-state document; large,
 *  unbounded ledger data (events/knowledge) belongs in a separate store, not here. */
export interface SaveDocument {
  version: number
  meta: SaveMeta
  /** Global/world state keyed by system save-key (e.g. `time`, `world`). */
  world: Record<string, unknown>
  /** Per-entity component snapshots. */
  entities: EntitySnapshot[]
}

/** The small `manifest.json` written alongside the body for cheap listing. */
export interface SaveManifest extends SaveMeta {
  version: number
}

/** A discovered save on disk, surfaced to the renderer for the load picker. */
export interface SaveSlotInfo {
  scenarioId: string
  saveName: string
  chatId: string
  slot: number
  gameTimeMs: number
  /** Relative path under the save_data root, e.g. `saves/<sid>/<name>/game.json`. */
  gameJsonPath: string
  /** File mtime in ms. */
  savedAt: number
}

/** Number of save slots offered per scenario. */
export const SAVE_SLOT_COUNT = 10

// Windows reserved device names (case-insensitive), forbidden as folder names.
const RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
])

// Characters illegal in a folder name on at least one of Windows/Linux/macOS.
const ILLEGAL_NAME_CHARS = /[<>:"/\\|?*]/

/**
 * Validates a user-supplied save name for use as a folder name across
 * Windows/Linux/macOS. Returns an error message if invalid, else null.
 */
export function validateSaveName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) return 'Name cannot be empty.'
  if (trimmed.length > 64) return 'Name must be 64 characters or fewer.'
  if (trimmed === '.' || trimmed === '..') return 'Name cannot be "." or "..".'
  if (ILLEGAL_NAME_CHARS.test(trimmed)) {
    return 'Name cannot contain < > : " / \\ | ? * characters.'
  }
  if (trimmed.endsWith('.')) {
    return 'Name cannot end with a dot.'
  }
  if (RESERVED_NAMES.has(trimmed.toLowerCase())) {
    return `"${trimmed}" is a reserved name.`
  }
  return null
}

/** Reply from the worker after a `START`. */
export interface SimStartResult {
  success: boolean
}
