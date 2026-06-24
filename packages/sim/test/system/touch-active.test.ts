import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startSimWorld, type SimTestWorld } from './simTestWorld'
import { TouchManagerKey } from '../../src/game/character/body/touch/TouchManager'

/** getActiveTouchInteractions walks a character's body and returns the active
 *  interaction ids; stopTouchUiAction re-finds the live reference by id. */
describe('active touch interactions (system test)', () => {
  let sim: SimTestWorld

  beforeEach(() => { sim = startSimWorld() })
  afterEach(() => { sim.dispose() })

  it('lists active interactions on both parties and stops by id', () => {
    const npc = sim.npcs[0] // NpcA — has tits

    expect(sim.player.require(TouchManagerKey).applyTouch({
      actorId: sim.player.id, targetId: npc.id,
      actorPartTag: 'hands', targetPartTag: 'tits', verb: 'grope',
    })).toBe(true)

    // The duo touch is active on the actor's hands slot and the target's tits slot,
    // so it shows up querying either body.
    expect(sim.world.getActiveTouchInteractions(npc.id)).toContain('hands_tits_grope')
    expect(sim.world.getActiveTouchInteractions(sim.player.id)).toContain('hands_tits_grope')

    // A character with no active touches returns an empty list.
    expect(sim.world.getActiveTouchInteractions(sim.npcs[1].id)).toEqual([])

    // Routing a stop by id re-finds the reference without throwing (teardown TODO).
    expect(() => sim.world.stopTouchUiAction(npc.id, 'hands_tits_grope')).not.toThrow()
  })
})
