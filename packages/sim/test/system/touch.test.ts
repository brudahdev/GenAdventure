import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startSimWorld, type SimTestWorld } from './simTestWorld'
import { BodyKey } from '../../src/game/character/body/Body'
import { touchIntent } from '../../src/game/character/body/touch/behavior/TouchIntent'

/** The touch inference action now routes through a behaviour tree
 *  (GoToCharacter + Touch) instead of calling TouchManager directly. These tests
 *  drive that path via `submitIntent` and assert the interaction lands. */
describe('touch behaviour (system test)', () => {
  let sim: SimTestWorld

  beforeEach(() => {
    sim = startSimWorld()
  })

  afterEach(() => {
    sim.dispose()
  })

  it('self grope applies a touch interaction via the behaviour tree', () => {
    const npc = sim.npcs[0] // NpcA — hasTits

    let settled: boolean | undefined
    // actor === target: the GoToCharacter subtree short-circuits (co-located),
    // then the Touch leaf applies the solo `hands_tits_grope_self` interaction.
    sim.world.submitIntent(
      touchIntent(npc.id, npc.id, 'hands', 'tits', 'grope'),
      (success) => { settled = success },
    )
    sim.runBehaviors()

    expect(settled).toBe(true)

    const tits = npc.require(BodyKey).getPart('tits')!
    const hasInteraction = tits.getAllSlots().some(slot => slot.getInteractions().length > 0)
    expect(hasInteraction).toBe(true)
  })
})
