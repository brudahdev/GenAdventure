import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startSimWorld, type SimTestWorld } from './simTestWorld'
import { CharacterLocationKey } from '../../src/game/character/location/CharacterLocation'
import { CharacterPoseKey } from '../../src/game/character/pose/CharacterPose'
import { ClothingManagerKey } from '../../src/game/character/clothing/ClothingManager'
import { ActorPlanKey } from '../../src/core/plan/ActorPlan'
import { alterClothingStateIntent } from '../../src/game/plan/planDefs'
import { calcPath } from '../../src/game/plan/locationPath'
import { isStanding } from '../../src/game/plan/poseGuards'
import type { Entity } from '../../src/core/ec/Entity'

const BEDROOM = '{{user}}s_bed_room'
const BEDROOM_BED = '{{user}}s_bed_room_bed'
const BATHROOM = '{{user}}s_bathroom'
const BATHROOM_SHOWER = '{{user}}s_bathroom_shower'

/** First clothing item that has at least one other state to switch to. */
function pickChangeable(entity: Entity): { itemId: string; newState: string } {
  const clothing = entity.require(ClothingManagerKey)
  for (const itemId of clothing.getClothingItemIds()) {
    const states = clothing.getClothingItemById(itemId)!.getInactiveStateIds()
    if (states.length > 0) return { itemId, newState: states[0] }
  }
  throw new Error(`no changeable clothing item on ${entity.id}`)
}

describe('plan layer (system test)', () => {
  let sim: SimTestWorld

  beforeEach(() => {
    sim = startSimWorld()
  })

  afterEach(() => {
    sim.dispose()
  })

  it('co-located self clothing change runs only the clothing command', () => {
    const npc = sim.npcs[0]
    const { itemId, newState } = pickChangeable(npc)

    const status = sim.world.submitIntent(alterClothingStateIntent(npc.id, npc.id, itemId, newState))

    expect(status).toEqual({ state: 'completed' })
    expect(npc.require(ClothingManagerKey).getClothingItemById(itemId)!.getCurrentStateId()).toBe(newState)
    expect(npc.require(ActorPlanKey).isIdle()).toBe(true) // plan cleared after completion
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
    const status = sim.world.submitIntent(alterClothingStateIntent(actor.id, target.id, itemId, newState))

    expect(status).toEqual({ state: 'completed' })
    // Actor stood up and walked to the target's sub-location.
    expect(isStanding(actor)).toBe(true)
    expect(actor.require(CharacterLocationKey).getCurrentSubLocation().id).toBe(BATHROOM_SHOWER)
    expect(actor.require(CharacterLocationKey).isAtSameSubLocationAsOther(target.id)).toBe(true)
    // Target's clothing changed.
    expect(target.require(ClothingManagerKey).getClothingItemById(itemId)!.getCurrentStateId()).toBe(newState)
    expect(actor.require(ActorPlanKey).isIdle()).toBe(true)
  })

  it('fails (no side effect) when the target clothing item does not exist', () => {
    const npc = sim.npcs[0]
    const status = sim.world.submitIntent(alterClothingStateIntent(npc.id, npc.id, 'no_such_item', 'off'))

    expect(status.state).toBe('failed')
    expect(npc.require(ActorPlanKey).isIdle()).toBe(true) // plan cleared after a terminal stop
  })
})
