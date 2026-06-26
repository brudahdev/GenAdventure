import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startSimWorld, type SimTestWorld } from './simTestWorld'
import type { Entity } from '../../src/core/ec/Entity'
import { BodyKey } from '../../src/game/character/body/Body'
import { TouchManagerKey } from '../../src/game/character/body/touch/TouchManager'
import { AvatarKey } from '../../src/game/character/Avatar'

/** All active touch interactions on one of a character's body parts. */
const interactionsOn = (entity: Entity, part: 'hands' | 'tits') =>
  entity.require(BodyKey).getPart(part)!.getAllSlots().flatMap(s => [...s.getInteractions()])

const ids = (entity: Entity, part: 'hands' | 'tits') =>
  interactionsOn(entity, part).map(i => i.getInteractionData().id)

/** Repro: player gropes npc1's tits, then holds npc2's thighs (same hands `hold`
 *  slot), which displaces the grope. The grope's interaction is correctly removed
 *  from npc1's slot, but npc1's avatar is never re-dirtied — so it's never
 *  regenerated and the stale grope image persists (a manual regen no-ops because
 *  `updateAvatar` early-returns when the avatar isn't dirty). */
describe('touch displacement (system test)', () => {
  let sim: SimTestWorld

  beforeEach(() => { sim = startSimWorld() })
  afterEach(() => { sim.dispose() })

  it('dirties the displaced duo target\'s avatar (and clears its slot) three way displacement', () => {
    const tm = sim.player.require(TouchManagerKey)
    const npc1 = sim.npcs[0] // NpcA — has tits
    const npc2 = sim.npcs[1] // NpcB — has thighs

    // Player gropes npc1's tits (duo) — dirties npc1's avatar.
    expect(tm.applyTouch({
      actorId: sim.player.id, targetId: npc1.id,
      actorPartTag: 'hands', targetPartTag: 'tits', verb: 'grope',
    })).toBe(true)

    // Regenerate npc1's avatar (mirrors the grope's onSettle in the real app) and
    // capture the prompt — it reflects the grope, and clears npc1's dirty flag.
    const gropePrompt = npc1.require(AvatarKey).updateAvatar()
    expect(gropePrompt).toBeDefined()

    // Player holds npc2's thighs — same hands `hold` slot, so it displaces the grope.
    expect(tm.applyTouch({
      actorId: sim.player.id, targetId: npc2.id,
      actorPartTag: 'hands', targetPartTag: 'thighs', verb: 'hold',
    })).toBe(true)

    // "removed from me": the player's hands slot now holds the thighs hold, not the grope.
    expect(ids(sim.player, 'hands')).toContain('hands_thighs_hold')
    expect(ids(sim.player, 'hands')).not.toContain('hands_tits_grope')

    // The grope interaction is correctly gone from npc1's tits slot.
    expect(interactionsOn(npc1, 'tits')).toHaveLength(0)

  })
})
