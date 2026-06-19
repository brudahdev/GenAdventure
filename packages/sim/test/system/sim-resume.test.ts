import * as path from 'path'
import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION, parseSaveDocument, type SaveDocument } from '@gen-adventure/shared'
import { NPC_A, NPC_B, PLAYER_CHARACTER_ID, componentBlob, readSave, resumeSimWorld } from './simTestWorld'

const LOCATION_KEY = 'character.location'
const POSE_KEY = 'character.pose'
const CLOTHING_KEY = 'character.clothing'

interface LocationBlob { locationId: string; subLocationId: string }
interface PoseBlob { poseId: string }
interface ClothingBlob { items: { id: string; stateId: string }[] }

describe('sim resume → persist (system test)', () => {
  it('restores saved state — including per-item clothing state — and persists it back', () => {
    const chatId = 'resumed-chat'
    const slot = 2
    const gameTimeMs = new Date(2025, 0, 2, 14, 30, 12, 345).getTime()

    // Saved positions/poses/clothing deliberately deviate from scenario defaults
    // so a pass proves the saved state was restored rather than regenerated. One
    // item per NPC is in a non-default state ('open'/'lifted') — the per-item
    // clothing state the old flat save format dropped.
    const saveData: SaveDocument = {
      version: CURRENT_SAVE_VERSION,
      meta: { chatId, slot, savedAt: 123, gameTimeMs },
      world: { time: { gameTimeMs } },
      entities: [
        {
          id: PLAYER_CHARACTER_ID,
          components: {
            [LOCATION_KEY]: { locationId: '{{user}}s_bed_room', subLocationId: '{{user}}s_bed_room_desk' },
            [POSE_KEY]: { poseId: 'sit' },
            [CLOTHING_KEY]: { items: [{ id: 'bow_tie_red', stateId: 'off' }, { id: 'button_up_blouse_white', stateId: 'on' }] },
          },
        },
        {
          id: NPC_A,
          components: {
            [LOCATION_KEY]: { locationId: '{{user}}s_bed_room', subLocationId: '{{user}}s_bed_room_bed' },
            [POSE_KEY]: { poseId: 'lay_on_back' },
            [CLOTHING_KEY]: { items: [{ id: 'button_up_shirt', stateId: 'open' }, { id: 'dress_pants_black', stateId: 'on' }] },
          },
        },
        {
          id: NPC_B,
          components: {
            [LOCATION_KEY]: { locationId: '{{user}}s_bathroom', subLocationId: '{{user}}s_bathroom_shower' },
            [POSE_KEY]: { poseId: 'sit' },
            [CLOTHING_KEY]: { items: [{ id: 'bra_white', stateId: 'lifted' }, { id: 'panties_pink', stateId: 'on' }] },
          },
        },
      ],
    }

    const { world, savesLocation, dispose } = resumeSimWorld(saveData)

    const saveName = 'resume-save'
    world.persist(path.join(savesLocation, saveName), chatId, slot)

    const saved = readSave(savesLocation, saveName)
    expect(saved.version).toBe(CURRENT_SAVE_VERSION)
    expect(saved.meta.chatId).toBe(chatId)
    expect(saved.meta.slot).toBe(slot)
    // gameTimeMs now round-trips exactly (stored as ms, not decomposed to minutes).
    expect(saved.meta.gameTimeMs).toBe(gameTimeMs)
    expect(saved.entities).toHaveLength(3)

    expect(componentBlob<LocationBlob>(saved, PLAYER_CHARACTER_ID, LOCATION_KEY)).toEqual({
      locationId: '{{user}}s_bed_room',
      subLocationId: '{{user}}s_bed_room_desk',
    })
    expect(componentBlob<PoseBlob>(saved, PLAYER_CHARACTER_ID, POSE_KEY)).toEqual({ poseId: 'sit' })
    expect(componentBlob<ClothingBlob>(saved, PLAYER_CHARACTER_ID, CLOTHING_KEY).items).toEqual([
      { id: 'bow_tie_red', stateId: 'off' },
      { id: 'button_up_blouse_white', stateId: 'on' },
    ])

    expect(componentBlob<LocationBlob>(saved, NPC_A, LOCATION_KEY)).toEqual({
      locationId: '{{user}}s_bed_room',
      subLocationId: '{{user}}s_bed_room_bed',
    })
    expect(componentBlob<PoseBlob>(saved, NPC_A, POSE_KEY)).toEqual({ poseId: 'lay_on_back' })
    expect(componentBlob<ClothingBlob>(saved, NPC_A, CLOTHING_KEY).items).toEqual([
      { id: 'button_up_shirt', stateId: 'open' },
      { id: 'dress_pants_black', stateId: 'on' },
    ])

    expect(componentBlob<LocationBlob>(saved, NPC_B, LOCATION_KEY)).toEqual({
      locationId: '{{user}}s_bathroom',
      subLocationId: '{{user}}s_bathroom_shower',
    })
    expect(componentBlob<PoseBlob>(saved, NPC_B, POSE_KEY)).toEqual({ poseId: 'sit' })
    expect(componentBlob<ClothingBlob>(saved, NPC_B, CLOTHING_KEY).items).toEqual([
      { id: 'bra_white', stateId: 'lifted' },
      { id: 'panties_pink', stateId: 'on' },
    ])

    dispose()
  })

  it('migrates a legacy v1 save and resumes from it', () => {
    const chatId = 'legacy-chat'
    const gameTimeMs = new Date(2024, 5, 1, 9, 0, 0, 0).getTime()
    // Legacy v1 on-disk shape (flat characters, item ids only).
    const v1 = {
      version: 1,
      chatId,
      slot: 1,
      gameTimeMs,
      characters: [
        { characterId: PLAYER_CHARACTER_ID, locationId: '{{user}}s_bed_room', subLocationId: '{{user}}s_bed_room_desk', poseId: 'sit', clothingItemIds: ['bow_tie_red'] },
        { characterId: NPC_A, locationId: '{{user}}s_bed_room', subLocationId: '{{user}}s_bed_room_bed', poseId: 'lay_on_back', clothingItemIds: ['button_up_shirt'] },
        { characterId: NPC_B, locationId: '{{user}}s_bathroom', subLocationId: '{{user}}s_bathroom_shower', poseId: 'sit', clothingItemIds: ['panties_pink'] },
      ],
    }

    const migrated = parseSaveDocument(JSON.stringify(v1))
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(migrated.meta.chatId).toBe(chatId)

    const { world, savesLocation, dispose } = resumeSimWorld(migrated)
    const saveName = 'legacy-save'
    world.persist(path.join(savesLocation, saveName), chatId, 1)

    const saved = readSave(savesLocation, saveName)
    expect(componentBlob<LocationBlob>(saved, NPC_A, LOCATION_KEY)).toEqual({
      locationId: '{{user}}s_bed_room',
      subLocationId: '{{user}}s_bed_room_bed',
    })
    expect(componentBlob<PoseBlob>(saved, NPC_A, POSE_KEY)).toEqual({ poseId: 'lay_on_back' })
    // v1 had no per-item state, so migration defaults each to 'on'.
    expect(componentBlob<ClothingBlob>(saved, PLAYER_CHARACTER_ID, CLOTHING_KEY).items).toEqual([
      { id: 'bow_tie_red', stateId: 'on' },
    ])

    dispose()
  })
})
