import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION } from '@gen-adventure/shared'
import { NPC_A, NPC_B, PLAYER_CHARACTER_ID, componentBlob, readSave, startSimWorld } from './simTestWorld'

const LOCATION_KEY = 'character.location'
const POSE_KEY = 'character.pose'
const CLOTHING_KEY = 'character.clothing'

interface LocationBlob { locationId: string; subLocationId: string }
interface PoseBlob { poseId: string }
interface ClothingBlob { items: { id: string; stateId: string }[] }

describe('sim start → persist (system test)', () => {
  it('boots from full config and writes the expected save document', () => {
    const { world, savesLocation, dispose } = startSimWorld()

    const chatId = 'test-chat'
    const saveName = 'test-save'
    world.persist(path.join(savesLocation, saveName), chatId, 1)

    const gamePath = path.join(savesLocation, saveName, 'game.json')
    expect(fs.existsSync(gamePath)).toBe(true)
    // A manifest is written alongside the body for cheap listing.
    expect(fs.existsSync(path.join(savesLocation, saveName, 'manifest.json'))).toBe(true)

    const saved = readSave(savesLocation, saveName)
    expect(saved.version).toBe(CURRENT_SAVE_VERSION)
    expect(saved.meta.chatId).toBe(chatId)
    expect(saved.meta.slot).toBe(1)
    expect(typeof saved.meta.gameTimeMs).toBe('number')
    // Time lives in world state too.
    expect((saved.world.time as { gameTimeMs: number }).gameTimeMs).toBe(saved.meta.gameTimeMs)

    // Player + 2 NPCs.
    expect(saved.entities).toHaveLength(3)

    // Starting clothing derives from each role's `startingOutfit` (roles.json) →
    // outfit.json: roleOrder 0/1 wear `anime`, the player (-1) wears `dressy`.
    const ANIME = ['bow_tie_red', 'button_up_blouse_white', 'skirt_pleated_blue', 'bra_white', 'panties_pink']
    const DRESSY = ['button_up_shirt', 'dress_pants_black']

    // Player starting state matches roles.json; location ids keep the literal
    // `{{user}}` template (the sim does no substitution).
    expect(componentBlob<LocationBlob>(saved, PLAYER_CHARACTER_ID, LOCATION_KEY)).toEqual({
      locationId: '{{user}}s_bed_room',
      subLocationId: '{{user}}s_bed_room_middle',
    })
    expect(componentBlob<PoseBlob>(saved, PLAYER_CHARACTER_ID, POSE_KEY)).toEqual({ poseId: 'stand' })
    expect(componentBlob<ClothingBlob>(saved, PLAYER_CHARACTER_ID, CLOTHING_KEY).items.map((i) => i.id)).toEqual(DRESSY)
    // Fresh start: every item is in its default 'on' state.
    expect(componentBlob<ClothingBlob>(saved, PLAYER_CHARACTER_ID, CLOTHING_KEY).items.every((i) => i.stateId === 'on')).toBe(true)

    expect(componentBlob<LocationBlob>(saved, NPC_A, LOCATION_KEY)).toEqual({
      locationId: '{{user}}s_bed_room',
      subLocationId: '{{user}}s_bed_room_middle',
    })
    expect(componentBlob<PoseBlob>(saved, NPC_A, POSE_KEY)).toEqual({ poseId: 'stand' })
    expect(componentBlob<ClothingBlob>(saved, NPC_A, CLOTHING_KEY).items.map((i) => i.id)).toEqual(ANIME)

    expect(componentBlob<LocationBlob>(saved, NPC_B, LOCATION_KEY)).toEqual({
      locationId: '{{user}}s_bed_room',
      subLocationId: '{{user}}s_bed_room_bed',
    })
    expect(componentBlob<PoseBlob>(saved, NPC_B, POSE_KEY)).toEqual({ poseId: 'stand' })
    expect(componentBlob<ClothingBlob>(saved, NPC_B, CLOTHING_KEY).items.map((i) => i.id)).toEqual(ANIME)

    dispose()
  })
})
