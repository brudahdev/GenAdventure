import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION, type SaveDocument } from '@gen-adventure/shared'
import {
  PLAYER_CHARACTER_ID,
  componentBlob,
  readSave,
  resumeSimWorld,
  startSimWorld,
  type SimTestWorld,
} from './simTestWorld'
import { BodyKey } from '../../src/game/character/body/Body'
import { TouchManagerKey, type TouchInteractionArgs } from '../../src/game/character/body/touch/TouchManager'

const TOUCH_KEY = 'character.touch'

/** A solo touch the male player supports: stroke own penis with hands. */
const selfStroke: TouchInteractionArgs = {
  actorId: PLAYER_CHARACTER_ID,
  targetId: PLAYER_CHARACTER_ID,
  actorPartTag: 'hands',
  targetPartTag: 'penis',
  verb: 'stroke',
}

interface TouchBlob { interactions: TouchInteractionArgs[] }

describe('touch persistence (system test)', () => {
  let sim: SimTestWorld | undefined

  beforeEach(() => { sim = undefined })
  afterEach(() => { sim?.dispose() })

  it('saves the acting character\'s active touches', () => {
    sim = startSimWorld()
    expect(sim.player.require(TouchManagerKey).applyTouch(selfStroke)).toBe(true)

    const saveName = 'touch-save'
    sim.world.persist(path.join(sim.savesLocation, saveName), 'chat', 1)

    const saved = readSave(sim.savesLocation, saveName)
    expect(componentBlob<TouchBlob>(saved, PLAYER_CHARACTER_ID, TOUCH_KEY).interactions)
      .toContainEqual(selfStroke)
  })

  it('re-applies saved touches on resume', () => {
    const saveData: SaveDocument = {
      version: CURRENT_SAVE_VERSION,
      meta: { chatId: 'chat', slot: 1, savedAt: 1, gameTimeMs: 0 },
      world: { time: { gameTimeMs: 0 } },
      entities: [
        { id: PLAYER_CHARACTER_ID, components: { [TOUCH_KEY]: { interactions: [selfStroke] } } },
      ],
    }

    sim = resumeSimWorld(saveData)

    // The touch was re-applied during lateInit: the penis part now holds an interaction.
    const penis = sim.player.require(BodyKey).getPart('penis')!
    const hasInteraction = penis.getAllSlots().some(slot => slot.getInteractions().length > 0)
    expect(hasInteraction).toBe(true)

    // ...and it round-trips back into the save.
    const saveName = 'touch-resave'
    sim.world.persist(path.join(sim.savesLocation, saveName), 'chat', 1)
    expect(componentBlob<TouchBlob>(readSave(sim.savesLocation, saveName), PLAYER_CHARACTER_ID, TOUCH_KEY).interactions)
      .toContainEqual(selfStroke)
  })
})
