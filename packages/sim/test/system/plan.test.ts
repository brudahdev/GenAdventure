import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startSimWorld, type SimTestWorld } from './simTestWorld'
import { CharacterLocationKey } from '../../src/game/character/location/CharacterLocation'
import { CharacterPoseKey } from '../../src/game/character/pose/CharacterPose'
import { ClothingManagerKey } from '../../src/game/character/clothing/ClothingManager'
import { alterClothingStateIntent } from '../../src/game/character/clothing/behavior/AlterClothingStateIntent'
import { goToCharacterIntent } from '../../src/game/character/locomotion/behavior/GoToCharacter/GoToCharacter'
import { calcPath } from '../../src/game/plan/locationPath'
import { isStanding } from '../../src/game/plan/poseGuards'
import type { Entity } from '../../src/core/ec/Entity'

const BEDROOM = '{{user}}s_bed_room'
const BEDROOM_BED = '{{user}}s_bed_room_bed'
const BATHROOM = '{{user}}s_bathroom'
const BATHROOM_SHOWER = '{{user}}s_bathroom_shower'
const BATHROOM_SINK = '{{user}}s_bathroom_sink'

/** First clothing item that has at least one other state to switch to. */
function pickChangeable(entity: Entity): { itemId: string; newState: string } {
  const clothing = entity.require(ClothingManagerKey)
  for (const itemId of clothing.getClothingItemIds()) {
    const states = clothing.getClothingItemById(itemId)!.getInactiveStateIds()
    if (states.length > 0) return { itemId, newState: states[0] }
  }
  throw new Error(`no changeable clothing item on ${entity.id}`)
}

/** The behaviour-tree action layer (system test). Intents now start trees that the
 *  runner steps across ticks; tests submit then pump `sim.runBehaviors()`. */
describe('behavior layer (system test)', () => {
  let sim: SimTestWorld

  beforeEach(() => {
    sim = startSimWorld()
  })

  afterEach(() => {
    sim.dispose()
  })

  it('co-located self clothing change runs only the clothing action', () => {
    const npc = sim.npcs[0]
    const { itemId, newState } = pickChangeable(npc)

    sim.world.submitIntent(alterClothingStateIntent(npc.id, npc.id, itemId, newState))
    sim.runBehaviors()

    expect(npc.require(ClothingManagerKey).getClothingItemById(itemId)!.getCurrentStateId()).toBe(newState)
    expect(sim.world.behaviorRunner.isIdle(npc.id)).toBe(true) // tree settled + dropped
  })

  it('calcPath walks the location graph and ends at the target sub-location', () => {
    const bedroom = sim.world.locationManager.getLocationById(BEDROOM)!
    const bathroom = sim.world.locationManager.getLocationById(BATHROOM)!

    const path = calcPath(
      sim.world.locationManager,
      bedroom.getSubLocationById(BEDROOM_BED)!,
      bathroom.getSubLocationById(BATHROOM_SHOWER)!,
    )

    expect(path).toEqual([BATHROOM, BATHROOM_SHOWER])
  })

  it('cross-location clothing change: actor stands, walks to target, then alters clothing', () => {
    const actor = sim.npcs[0]
    const target = sim.npcs[1]
    const bedroom = sim.world.locationManager.getLocationById(BEDROOM)!
    const bathroom = sim.world.locationManager.getLocationById(BATHROOM)!

    // Actor sitting in the bedroom; target in the bathroom shower.
    actor.require(CharacterLocationKey).setCurrentSubLocation(bedroom.getSubLocationById(BEDROOM_BED)!)
    actor.require(CharacterPoseKey).setPoseById('sit')
    target.require(CharacterLocationKey).setCurrentSubLocation(bathroom.getSubLocationById(BATHROOM_SHOWER)!)

    expect(isStanding(actor)).toBe(false) // precondition for the test

    const { itemId, newState } = pickChangeable(target)
    sim.world.submitIntent(alterClothingStateIntent(actor.id, target.id, itemId, newState))
    sim.runBehaviors()

    // Actor stood up and walked to the target's sub-location.
    expect(isStanding(actor)).toBe(true)
    expect(actor.require(CharacterLocationKey).getCurrentSubLocation().id).toBe(BATHROOM_SHOWER)
    expect(actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(target.id)).toBe(true)
    // Target's clothing changed.
    expect(target.require(ClothingManagerKey).getClothingItemById(itemId)!.getCurrentStateId()).toBe(newState)
    expect(sim.world.behaviorRunner.isIdle(actor.id)).toBe(true)
  })

  it('goto-character is reactive: re-paths when the target moves mid-walk', () => {
    const actor = sim.npcs[0]
    const target = sim.npcs[1]
    const bedroom = sim.world.locationManager.getLocationById(BEDROOM)!
    const bathroom = sim.world.locationManager.getLocationById(BATHROOM)!

    actor.require(CharacterLocationKey).setCurrentSubLocation(bedroom.getSubLocationById(BEDROOM_BED)!)
    target.require(CharacterLocationKey).setCurrentSubLocation(bathroom.getSubLocationById(BATHROOM_SHOWER)!)

    // Start walking toward the target (the immediate step takes the first hop).
    sim.world.submitIntent(goToCharacterIntent(actor.id, target.id))
    expect(actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(target.id)).toBe(false)

    // Target relocates within the bathroom before the actor arrives. Because
    // HopTowardTarget re-reads the target's current sub-location each step, the
    // actor heads to the *new* spot, not the one it set out for.
    target.require(CharacterLocationKey).setCurrentSubLocation(bathroom.getSubLocationById(BATHROOM_SINK)!)
    sim.runBehaviors()

    expect(actor.require(CharacterLocationKey).getCurrentSubLocation().id).toBe(BATHROOM_SINK)
    expect(actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(target.id)).toBe(true)
    expect(sim.world.behaviorRunner.isIdle(actor.id)).toBe(true)
  })

  it('settles (no crash) when the target clothing item does not exist', () => {
    const npc = sim.npcs[0]
    sim.world.submitIntent(alterClothingStateIntent(npc.id, npc.id, 'no_such_item', 'off'))
    sim.runBehaviors()

    expect(sim.world.behaviorRunner.isIdle(npc.id)).toBe(true) // tree settled (failed) + dropped
  })
})
