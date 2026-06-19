import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NPC_A, NPC_B, startSimWorld, type SimTestWorld } from './simTestWorld'
import { PlayerKey } from '../../src/game/character/player/PlayerControlled'
import { NpcActivityKey } from '../../src/game/character/npc/NpcActivity'
import { getName } from '../../src/game/character/characterViews'

/** Demonstrates the harness: a fresh SimWorld boots for every `it`, and tests
 *  reach straight for `sim.world` / `sim.player` / `sim.npcs` with no boilerplate. */
describe('sim world (system test)', () => {
  let sim: SimTestWorld

  beforeEach(() => {
    sim = startSimWorld()
  })

  afterEach(() => {
    sim.dispose()
  })

  it('spawns the player tagged as player-controlled', () => {
    expect(sim.player.has(PlayerKey)).toBe(true)
    expect(sim.player.has(NpcActivityKey)).toBe(false)
    expect(getName(sim.player)).toBe('{{user}}')
  })

  it('spawns both npcs with their roster names and activity tracking', () => {
    expect(sim.npcs).toHaveLength(2)
    expect(sim.npcs.map((npc) => npc.id)).toEqual([NPC_A, NPC_B])
    expect(sim.npcs.every((npc) => npc.has(NpcActivityKey))).toBe(true)
    expect(getName(sim.world.registry.getById(NPC_A)!)).toBe('NpcA')
    expect(getName(sim.world.registry.getById(NPC_B)!)).toBe('NpcB')
  })

  it('starts NpcA active in the player\'s sub-location', () => {
    expect(sim.world.getActiveNpcs()).toContain(NPC_A)
  })
})
