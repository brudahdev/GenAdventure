import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NPC_A, NPC_B, startSimWorld, type SimTestWorld } from './simTestWorld'
import { PlayerKey } from '../../src/game/character/player/PlayerControlled'
import { NpcActivityKey } from '../../src/game/character/npc/NpcActivity'
import { getName } from '../../src/game/character/characterViews'
import { CharacterLocation, CharacterLocationKey } from '../../src/game/character/location/CharacterLocation'
import { LocationContextItem } from '../../src/game/location/LocationContextItem'
import { ClothingManagerKey } from '../../src/game/character/clothing/ClothingManager'
import { CharacterPoseKey } from '../../src/game/character/pose/CharacterPose'

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

  it('pose context', () => {//todo

    // let context = (sim.npcs[0].require(ClothingManagerKey) as any).contextItem as LocationContextItem

    // expect(context.value).includes("NpcA's clothing:[red bow tie,short sleeve button up blouse,navy blue pleated skirt,white bra (covered),pink panties (covered)]")
    // expect(context.characterIds).includes(sim.player.id)
    // expect(context.characterIds).includes(sim.npcs[0].id)
    // expect(context.characterIds).includes(sim.npcs[1].id)

    // //move sublocaiton todo use movement system
    // let bedroom = sim.world.locationManager.getLocationById("{{user}}s_bed_room")!
    // sim.player.require(CharacterLocationKey).setCurrentSubLocation(bedroom.getSubLocationById("{{user}}s_bed_room_desk")!)


    // expect(context.value).includes("NpcA's clothing:[red bow tie,short sleeve button up blouse,navy blue pleated skirt,white bra (covered),pink panties (covered)]")
    // expect(context.characterIds).includes(sim.player.id)
    // expect(context.characterIds).includes(sim.npcs[0].id)
    // expect(context.characterIds).includes(sim.npcs[1].id)



    // //now move locations todo use movement system
    // let bathroom = sim.world.locationManager.getLocationById("{{user}}s_bathroom")!
    // sim.player.require(CharacterLocationKey).setCurrentSubLocation(bathroom.getSubLocationById("{{user}}s_bathroom_sink")!)

    // expect(context.value).includes("NpcA's clothing:[red bow tie,short sleeve button up blouse,navy blue pleated skirt,white bra (covered),pink panties (covered)]")
    // expect(context.characterIds).not.includes(sim.player.id)
    // expect(context.characterIds).includes(sim.npcs[0].id)
    // expect(context.characterIds).includes(sim.npcs[1].id)
  })

  it('pose self', () => {

    const npc1 = sim.npcs[0]

    npc1.require(CharacterPoseKey).inferenceAction?.handle({
      subjectName: getName(npc1),
      newPoseName: 'sit'
    })
    let currentPose = npc1.require(CharacterPoseKey).getCurrentPoseId()
    expect(currentPose).toBe("sit")

    npc1.require(CharacterPoseKey).inferenceAction?.handle({
      subjectName: getName(npc1),
      newPoseName: 'stand'
    })
    currentPose = npc1.require(CharacterPoseKey).getCurrentPoseId()
    expect(currentPose).toBe("stand")

  })

  it('pose other', () => {

    const npc1 = sim.npcs[0]
    const npc2 = sim.npcs[1]

    npc1.require(CharacterPoseKey).inferenceAction?.handle({
      subjectName: getName(npc2),
      newPoseName: 'sit'
    })
    let currentPose = npc2.require(CharacterPoseKey).getCurrentPoseId()
    expect(currentPose).toBe("sit")

    npc1.require(CharacterPoseKey).inferenceAction?.handle({
      subjectName: getName(npc2),
      newPoseName: 'stand'
    })
    currentPose = npc2.require(CharacterPoseKey).getCurrentPoseId()
    expect(currentPose).toBe("stand")

  })



})
