import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startSimWorld, type SimTestWorld } from './simTestWorld'
import { BodyKey } from '../../src/game/character/body/Body'
import { CharacterLocationKey } from '../../src/game/character/location/CharacterLocation'
import { TouchManagerKey } from '../../src/game/character/body/touch/TouchManager'
import type { Entity } from '../../src/core/ec/Entity'

const interactionsOn = (entity: Entity, part: 'hands' | 'tits' | 'thighs') =>
  entity.require(BodyKey).getPart(part)!.getAllSlots().flatMap(s => [...s.getInteractions()])

const ids = (entity: Entity, part: 'hands' | 'tits' | 'thighs') =>
  interactionsOn(entity, part).map(i => i.getInteractionData().id)

/** Tests that active duo touch interactions are cancelled when a character moves. */
describe('touch cleared on location change (system test)', () => {
  let sim: SimTestWorld

  beforeEach(() => { sim = startSimWorld() })
  afterEach(() => { sim.dispose() })

  it('clears duo touch when the player (actor) moves to a different location', () => {
    const npc = sim.npcs[0] // NpcA — has tits

    expect(sim.player.require(TouchManagerKey).applyTouch({
      actorId: sim.player.id, targetId: npc.id,
      actorPartTag: 'hands', targetPartTag: 'tits', verb: 'grope',
    })).toBe(true)

    expect(ids(sim.player, 'hands')).toContain('hands_tits_grope')
    expect(interactionsOn(npc, 'tits')).toHaveLength(1)

    // Move the player to a different sub-location; this emits location.changed
    const bedroom = sim.world.locationManager.getLocationById("{{user}}s_bed_room")!
    sim.player.require(CharacterLocationKey).setCurrentSubLocation(
      bedroom.getSubLocationById("{{user}}s_bed_room_desk")!
    )

    expect(ids(sim.player, 'hands')).not.toContain('hands_tits_grope')
    expect(interactionsOn(npc, 'tits')).toHaveLength(0)
  })

  it('clears duo touch when the NPC (target) moves', () => {
    const npc = sim.npcs[0] // NpcA — has tits

    expect(sim.player.require(TouchManagerKey).applyTouch({
      actorId: sim.player.id, targetId: npc.id,
      actorPartTag: 'hands', targetPartTag: 'tits', verb: 'grope',
    })).toBe(true)

    expect(interactionsOn(npc, 'tits')).toHaveLength(1)

    // Move the NPC to a different sub-location; this emits location.changed for npc.id
    const bedroom = sim.world.locationManager.getLocationById("{{user}}s_bed_room")!
    npc.require(CharacterLocationKey).setCurrentSubLocation(
      bedroom.getSubLocationById("{{user}}s_bed_room_desk")!
    )

    expect(interactionsOn(npc, 'tits')).toHaveLength(0)
    expect(ids(sim.player, 'hands')).not.toContain('hands_tits_grope')
  })

  it('does not clear duo touch when an unrelated character moves', () => {
    const npc1 = sim.npcs[0] // NpcA — has tits
    const npc2 = sim.npcs[1] // NpcB

    expect(sim.player.require(TouchManagerKey).applyTouch({
      actorId: sim.player.id, targetId: npc1.id,
      actorPartTag: 'hands', targetPartTag: 'tits', verb: 'grope',
    })).toBe(true)

    expect(interactionsOn(npc1, 'tits')).toHaveLength(1)

    // Move npc2, which is not involved in the active touch
    const bedroom = sim.world.locationManager.getLocationById("{{user}}s_bed_room")!
    npc2.require(CharacterLocationKey).setCurrentSubLocation(
      bedroom.getSubLocationById("{{user}}s_bed_room_desk")!
    )

    // npc1's touch is unaffected
    expect(interactionsOn(npc1, 'tits')).toHaveLength(1)
    expect(ids(sim.player, 'hands')).toContain('hands_tits_grope')
  })

  it('does not clear solo touch interactions when the actor moves', () => {
    const npc = sim.npcs[0] // NpcA — has tits (solo grope on self)

    expect(npc.require(TouchManagerKey).applyTouch({
      actorId: npc.id, targetId: npc.id,
      actorPartTag: 'hands', targetPartTag: 'tits', verb: 'grope',
    })).toBe(true)

    expect(interactionsOn(npc, 'tits')).toHaveLength(1)

    // Move the NPC
    const bedroom = sim.world.locationManager.getLocationById("{{user}}s_bed_room")!
    npc.require(CharacterLocationKey).setCurrentSubLocation(
      bedroom.getSubLocationById("{{user}}s_bed_room_desk")!
    )

    // Solo interactions are not DuoTouchInteraction, so they should be preserved
    expect(interactionsOn(npc, 'tits')).toHaveLength(1)
  })
})
