import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startSimWorld, type SimTestWorld } from './simTestWorld'
import type { TouchOptions } from '@gen-adventure/shared'

/** Helpers to read the nested id-only TouchOptions graph. */
const target = (o: TouchOptions, id: string) => o.targets.find(t => t.id === id)
const withPart = (o: TouchOptions, t: string, w: string) => target(o, t)?.with.find(x => x.id === w)
const verbs = (o: TouchOptions, t: string, w: string) => withPart(o, t, w)?.verb.map(v => v.id) ?? []

/** Touch options are now pulled from sim and built from the interaction configs,
 *  filtered to the parts each body actually has. Player is male (penis, no
 *  tits/pussy); NpcA is female (tits + pussy, no penis). */
describe('touch options (system test)', () => {
  let sim: SimTestWorld

  beforeEach(() => { sim = startSimWorld() })
  afterEach(() => { sim.dispose() })

  it('player (solo) only includes interactions whose parts the player has', () => {
    const opts = sim.world.getTouchOptions(sim.player.id)

    // Male player: the only qualifying solo interaction is hands -> penis (stroke).
    expect(verbs(opts, 'penis', 'hands')).toContain('stroke')
    // No tits / pussy on the player → those solo interactions are filtered out.
    expect(target(opts, 'tits')).toBeUndefined()
    expect(target(opts, 'pussy')).toBeUndefined()
  })

  it('npc (duo) filters on player actorPart + npc targetPart', () => {
    const npc = sim.npcs[0] // NpcA — female
    const opts = sim.world.getTouchOptions(npc.id)

    // hands -> tits supports both grope and pinch, grouped under the same with-part.
    expect(verbs(opts, 'tits', 'hands')).toEqual(expect.arrayContaining(['grope']))
    expect(verbs(opts, 'nipples', 'hands')).toEqual(expect.arrayContaining(['pinch']))

    // pussy is reachable with hands (finger) and penis (penitrate).
    expect(verbs(opts, 'pussy', 'hands')).toContain('finger')
    expect(verbs(opts, 'pussy', 'penis')).toContain('penitrate')

    // The NPC has no penis, so penis-target interactions (e.g. hands_penis_stroke,
    // mouth_penis_suck) are excluded.
    expect(target(opts, 'penis')).toBeUndefined()
  })
})
