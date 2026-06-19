import { describe, expect, it } from 'vitest'
import { NPC_A, NPC_B, startSimWorld } from './simTestWorld'
import { ClothingManagerKey } from '../../src/game/character/clothing/ClothingManager'
import { NpcActivityKey } from '../../src/game/character/npc/NpcActivity'
import { PlayerKey } from '../../src/game/character/player/PlayerControlled'
import { getName } from '../../src/game/character/characterViews'

/** Proves the EC composition layer: the CharacterSpawner assembles entities,
 *  marker components distinguish player from npc, and registry queries see every
 *  character. */
describe('CharacterSpawner composition (system test)', () => {
  it('tags the player, tracks npc activity, and queries components', () => {
    const { world, player, npcs, dispose } = startSimWorld()

    // The player is the entity with a PlayerControlled marker and no npc activity.
    expect(player.has(PlayerKey)).toBe(true)
    expect(player.has(NpcActivityKey)).toBe(false)

    const npcA = world.registry.getById(NPC_A)
    expect(npcA!.has(PlayerKey)).toBe(false)
    expect(npcA!.has(NpcActivityKey)).toBe(true)

    // Names from SimStartCharacterData are retained on the entity; the player
    // (absent from the start roster) falls back to the default name.
    expect(getName(npcA!)).toBe('NpcA')
    expect(getName(world.registry.getById(NPC_B)!)).toBe('NpcB')
    expect(getName(player)).toBe('{{user}}')

    // Two NPCs spawned alongside the player.
    expect(npcs).toHaveLength(2)

    // NpcA starts in the player's sub-location (roles.json) → active.
    expect(world.getActiveNpcs()).toContain(NPC_A)

    // The clothing query sees every character (player + 2 npcs) through the
    // generic registry — proving cross-entity component queries.
    expect(world.registry.with(ClothingManagerKey)).toHaveLength(3)

    dispose()
  })
})
