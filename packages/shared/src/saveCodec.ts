import type {
  CharacterSaveState,
  SaveDocument,
  SaveManifest,
  SimSaveData,
} from './sim-messages'

/** The save schema version this build writes. Bump when the on-disk shape
 *  changes and add a migration step in {@link migrate}. */
export const CURRENT_SAVE_VERSION = 2

// Component keys the v1→v2 migration maps the old flat rows onto. These mirror
// the sim's `ComponentKey` ids (`CharacterLocationKey`, etc.) — a stable on-disk
// contract, so they're duplicated here rather than imported across the boundary.
const LOCATION_KEY = 'character.location'
const POSE_KEY = 'character.pose'
const CLOTHING_KEY = 'character.clothing'
const TIME_KEY = 'time'

/** The single seam that knows the on-disk layout. Pure (string ⇄ object); the
 *  actual file I/O is done by each process (worker writes, main reads). */

export function serializeSaveDocument(doc: SaveDocument): string {
  return JSON.stringify(doc, null, 2)
}

export function serializeManifest(manifest: SaveManifest): string {
  return JSON.stringify(manifest, null, 2)
}

export function buildManifest(doc: SaveDocument): SaveManifest {
  return {
    version: doc.version,
    chatId: doc.meta.chatId,
    slot: doc.meta.slot,
    savedAt: doc.meta.savedAt,
    gameTimeMs: doc.meta.gameTimeMs,
  }
}

/** Parse + validate + migrate a save body (`game.json`) to the current version.
 *  Throws on unreadable/invalid input — callers decide how to surface that. */
export function parseSaveDocument(raw: string): SaveDocument {
  let obj: unknown
  try {
    obj = JSON.parse(raw)
  } catch (e) {
    throw new Error(`save is not valid JSON: ${e instanceof Error ? e.message : e}`)
  }
  return migrate(obj)
}

/** Best-effort read of a listing summary from either a `manifest.json`, a v2
 *  body, or a legacy v1 body. Returns null for anything that isn't a save (so
 *  the picker can silently skip it). Never throws. */
export function parseManifest(raw: string): SaveManifest | null {
  let obj: Record<string, unknown>
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    obj = parsed as Record<string, unknown>
  } catch {
    return null
  }

  // v2 body nests the summary under `meta`; v2 manifest and v1 body are flat.
  const meta = (isRecord(obj.meta) ? obj.meta : obj) as Record<string, unknown>
  if (typeof meta.chatId !== 'string' || typeof meta.slot !== 'number') {
    return null
  }
  return {
    version: typeof obj.version === 'number' ? obj.version : 1,
    chatId: meta.chatId,
    slot: meta.slot,
    savedAt: typeof meta.savedAt === 'number' ? meta.savedAt : 0,
    gameTimeMs: typeof meta.gameTimeMs === 'number' ? meta.gameTimeMs : 0,
  }
}

// --- migration ----------------------------------------------------------------

function migrate(obj: unknown): SaveDocument {
  if (!isRecord(obj)) {
    throw new Error('save is not an object')
  }
  const version = typeof obj.version === 'number' ? obj.version : 1

  let doc: unknown = obj
  if (version < 2) {
    doc = migrateV1toV2(obj as unknown as SimSaveData)
  }

  return validate(doc)
}

function migrateV1toV2(v1: SimSaveData): SaveDocument {
  const characters: CharacterSaveState[] = Array.isArray(v1.characters) ? v1.characters : []
  return {
    version: 2,
    meta: {
      chatId: v1.chatId,
      slot: v1.slot,
      savedAt: 0, // unknown for legacy saves; listing falls back to file mtime
      gameTimeMs: v1.gameTimeMs ?? 0,
    },
    world: {
      [TIME_KEY]: { gameTimeMs: v1.gameTimeMs ?? 0 },
    },
    entities: characters.map((c) => ({
      id: c.characterId,
      components: {
        [LOCATION_KEY]: { locationId: c.locationId, subLocationId: c.subLocationId },
        [POSE_KEY]: { poseId: c.poseId },
        // v1 saved item ids only; states default to 'on' (the old behaviour).
        [CLOTHING_KEY]: {
          items: (c.clothingItemIds ?? []).map((id) => ({ id, stateId: 'on' })),
        },
      },
    })),
  }
}

function validate(doc: unknown): SaveDocument {
  if (!isRecord(doc)) throw new Error('save document is not an object')
  if (typeof doc.version !== 'number') throw new Error('save document missing version')
  if (!isRecord(doc.meta) || typeof doc.meta.chatId !== 'string' || typeof doc.meta.slot !== 'number') {
    throw new Error('save document has invalid meta')
  }
  if (!isRecord(doc.world)) throw new Error('save document missing world')
  if (!Array.isArray(doc.entities)) throw new Error('save document missing entities')
  return doc as unknown as SaveDocument
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
