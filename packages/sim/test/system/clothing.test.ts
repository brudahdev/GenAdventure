import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NPC_A, NPC_B, startSimWorld, type SimTestWorld } from './simTestWorld'
import { PlayerKey } from '../../src/game/character/player/PlayerControlled'
import { NpcActivityKey } from '../../src/game/character/npc/NpcActivity'
import { getName } from '../../src/game/character/characterViews'
import { CharacterLocation, CharacterLocationKey } from '../../src/game/character/location/CharacterLocation'
import { LocationContextItem } from '../../src/game/location/LocationContextItem'
import { ClothingManagerKey } from '../../src/game/character/clothing/ClothingManager'

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

  it('clothing context', () => {

    let context = (sim.npcs[0].require(ClothingManagerKey) as any).contextItem as LocationContextItem

    expect(context.value).includes("NpcA's clothing:[red bow tie,short sleeve button up blouse,navy blue pleated skirt,white bra (covered),pink panties (covered)]")
    expect(context.characterIds).includes(sim.player.id)
    expect(context.characterIds).includes(sim.npcs[0].id)
    expect(context.characterIds).includes(sim.npcs[1].id)

    //move sublocaiton todo use movement system
    let bedroom = sim.world.locationManager.getLocationById("{{user}}s_bed_room")!
    sim.player.require(CharacterLocationKey).setCurrentSubLocation(bedroom.getSubLocationById("{{user}}s_bed_room_desk")!)


    expect(context.value).includes("NpcA's clothing:[red bow tie,short sleeve button up blouse,navy blue pleated skirt,white bra (covered),pink panties (covered)]")
    expect(context.characterIds).includes(sim.player.id)
    expect(context.characterIds).includes(sim.npcs[0].id)
    expect(context.characterIds).includes(sim.npcs[1].id)



    //now move locations todo use movement system
    let bathroom = sim.world.locationManager.getLocationById("{{user}}s_bathroom")!
    sim.player.require(CharacterLocationKey).setCurrentSubLocation(bathroom.getSubLocationById("{{user}}s_bathroom_sink")!)

    expect(context.value).includes("NpcA's clothing:[red bow tie,short sleeve button up blouse,navy blue pleated skirt,white bra (covered),pink panties (covered)]")
    expect(context.characterIds).not.includes(sim.player.id)
    expect(context.characterIds).includes(sim.npcs[0].id)
    expect(context.characterIds).includes(sim.npcs[1].id)
  })

  it('undress anime outfit self', () => {

    const npc1 = sim.npcs[0]

    // npc1.require(ClothingManagerKey).inferenceAction?.handle({
    //   subjectName: getName(npc1),
    //   clothingName: 'bowtie',
    //   clothingState: 'remove'
    // })
    // const bowTie = npc1.require(ClothingManagerKey).getClothingItemByTag("bowtie")
    // expect(bowTie?.getCurrentStateId()).toBe("off")

    // npc1.require(ClothingManagerKey).inferenceAction?.handle({
    //   subjectName: getName(npc1),
    //   clothingName: 'skirt',
    //   clothingState: 'remove'
    // })
    // const skirt = npc1.require(ClothingManagerKey).getClothingItemByTag("skirt")
    // expect(skirt?.getCurrentStateId()).toBe("off")


    npc1.require(ClothingManagerKey).inferenceAction?.handle({
      subjectName: getName(npc1),
      clothingName: 'panties',
      clothingState: 'remove'
    })
    const panties = npc1.require(ClothingManagerKey).getClothingItemById("panties_pink")
    expect(panties?.getCurrentStateId()).toBe("off")

  })


})
