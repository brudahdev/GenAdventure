import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NPC_A, NPC_B, startSimWorld, type SimTestWorld } from './simTestWorld'
import { PlayerKey } from '../../src/game/character/player/PlayerControlled'
import { NpcActivityKey } from '../../src/game/character/npc/NpcActivity'
import { getName } from '../../src/game/character/characterViews'
import { CharacterLocation, CharacterLocationKey } from '../../src/game/character/location/CharacterLocation'
import { LocationContextItem } from '../../src/game/location/LocationContextItem'

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

  it('location context', () => {

    let context = (sim.player.require(CharacterLocationKey).getCurrentSubLocation().getParent() as any).myContextItem as LocationContextItem

    expect(context.value).includes("{{user}}")
    expect(context.value).includes("NpcA")
    expect(context.value).includes("NpcB")
    expect(context.value).includes("are in {{user}}'s bedroom. It is clean. There is an unmade bed in the corner facing a large desk across the room. On the desk is a large desktop and two big monitors on arms.")
    expect(context.characterIds).includes(sim.player.id)
    expect(context.characterIds).includes(sim.npcs[0].id)
    expect(context.characterIds).includes(sim.npcs[1].id)

    //move sublocaiton todo use movement system
    let bedroom = sim.world.locationManager.getLocationById("{{user}}s_bed_room")!
    sim.player.require(CharacterLocationKey).setCurrentSubLocation(bedroom.getSubLocationById("{{user}}s_bed_room_desk")!)


    expect(context.value).includes("{{user}}")
    expect(context.value).includes("NpcA")
    expect(context.value).includes("NpcB")
    expect(context.value).includes("are in {{user}}'s bedroom. It is clean. There is an unmade bed in the corner facing a large desk across the room. On the desk is a large desktop and two big monitors on arms.")
    expect(context.characterIds).includes(sim.player.id)
    expect(context.characterIds).includes(sim.npcs[0].id)
    expect(context.characterIds).includes(sim.npcs[1].id)



    //now move locations todo use movement system
    let bathroom = sim.world.locationManager.getLocationById("{{user}}s_bathroom")!
    sim.player.require(CharacterLocationKey).setCurrentSubLocation(bathroom.getSubLocationById("{{user}}s_bathroom_sink")!)

    expect(context.value).includes("NpcA and NpcB are in {{user}}'s bedroom. It is clean. There is an unmade bed in the corner facing a large desk across the room. On the desk is a large desktop and two big monitors on arms.")
    expect(context.characterIds).not.includes(sim.player.id)
    expect(context.characterIds).includes(sim.npcs[0].id)
    expect(context.characterIds).includes(sim.npcs[1].id)
  })


})
