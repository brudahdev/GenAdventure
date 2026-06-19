import { singleton } from 'tsyringe'
import type { NpcActivationChange } from '@gen-adventure/shared'
import { SimManager } from '../sim/SimManager'
import { AvatarService } from '../avatar/AvatarService'
import { CharacterService } from './CharacterService'
import { VoxtaClient } from '../../integration/voxta/voxtaClient'
import { GenerationActivity } from '../imageGeneration/GenerationActivity'

/**
 * Owns runtime NPC activation/deactivation: an NPC is "active" iff co-located
 * with the player. The sim emits `npc.activation.changed`, which arrives here via
 * {@link SimManager.onNpcActivationChanged}.
 *
 * On activation we add the character to the Voxta chat and generate + show their
 * avatar (pausing the sim and showing an overlay, since the sim is live). On
 * deactivation we remove them from the chat and drop their avatar from the chat
 * page. Also owns the bulk {@link syncActiveCharacters} reconcile used at
 * scenario start/load.
 */
@singleton()
export class CharacterActivationService {
  constructor(
    private readonly sim: SimManager,
    private readonly avatarService: AvatarService,
    private readonly characterService: CharacterService,
    private readonly voxtaClient: VoxtaClient,
    private readonly activity: GenerationActivity
  ) {
    this.sim.onNpcActivationChanged((change) => void this.handle(change))
  }

  /** React to a single NPC's activation change. */
  async handle(change: NpcActivationChange): Promise<void> {
    if (change.isActive) {
      await this.activate(change.characterId)
    } else {
      await this.deactivate(change.characterId)
    }
  }

  /** Add the NPC to the chat and generate + show their avatar. */
  private async activate(characterId: string): Promise<void> {
    // Register the pending avatar work synchronously (before any await) so a scene
    // transition waiting on `whenIdle()` can't fade out before this avatar is done.
    // GenerationActivity also owns the sim pause + loading overlay for the whole
    // batch, so the sim stays paused / the spinner stays up until everything is done.
    const name = this.characterService.getScenarioCharacterById(characterId)?.name
    this.activity.begin(`Generating avatar for ${name ?? characterId}...`)
    try {
      await this.voxtaClient.addChatParticipant(characterId)

      const sim = this.sim.getSim()
      if (!sim) return

      const prompt = await sim.getAvatarPromptForCharacter(characterId)
      await this.avatarService.handle(prompt)
    } catch (err) {
      console.error('[activation] failed to generate avatar:', err)
    } finally {
      this.activity.end()
    }
  }

  /** Remove the NPC from the chat and drop their avatar from the chat page. */
  private async deactivate(characterId: string): Promise<void> {
    await this.voxtaClient.removeChatParticipant(characterId)
    this.avatarService.remove(characterId)
  }

  /** Reconcile Voxta chat participants against the sim's active character set.
   *  Characters in the roster whose id appears in `activeCharacterIds` are added;
   *  the rest are removed. */
  async syncActiveCharacters(activeCharacterIds: string[]): Promise<void> {
    const active = new Set(activeCharacterIds)
    for (const character of this.characterService.getScenarioCharacters()) {
      if (active.has(character.characterId)) {
        await this.voxtaClient.addChatParticipant(character.characterId)
      } else {
        await this.voxtaClient.removeChatParticipant(character.characterId)
      }
    }
  }
}
