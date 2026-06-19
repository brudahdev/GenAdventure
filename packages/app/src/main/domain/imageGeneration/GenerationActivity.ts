import { singleton } from 'tsyringe'
import { SimManager } from '../sim/SimManager'

/**
 * Single owner of the "scene is loading" gate for runtime image generation: an
 * intent-level in-flight counter that pauses the sim while any work is outstanding
 * and resumes once it's all done, and lets a scene transition hold the black until
 * everything has finished (`whenIdle`).
 *
 * Callers `begin()` the moment they know work is coming (synchronously, before any
 * `await` such as a Voxta call or an enqueue) and `end()` in a `finally`. Because a
 * location change generates the background *and* the activating NPCs' avatars
 * concurrently — each via its own service — centralising the pause/gate here means
 * the sim resumes only when the **last** unit finishes, not when whichever finishes
 * first runs its `finally`. The counter is seeded at intent time, so it never has
 * the gap the image queue can (an avatar may not be enqueued yet when the background
 * finishes). The loading overlay is owned separately by `ImageGenerationService`
 * (driven by the actual generation queue, so it never shows for cache hits).
 *
 * Scenario start does not go through here (it generates while the sim is paused by
 * default and drives its own overlay), so its flow is unaffected.
 */
@singleton()
export class GenerationActivity {
  private count = 0
  private idleResolvers: (() => void)[] = []

  constructor(private readonly sim: SimManager) {}

  /** Register one unit of pending work; pauses the sim on the first unit. Call
   *  before any `await`. */
  begin(): void {
    this.count++
    if (this.count === 1) this.sim.pauseTime()
  }

  /** Mark one unit done; on the last unit resumes the sim and wakes `whenIdle()`
   *  waiters. */
  end(): void {
    if (this.count === 0) return
    this.count--
    if (this.count === 0) {
      this.sim.resumeTime()
      const resolvers = this.idleResolvers
      this.idleResolvers = []
      for (const resolve of resolvers) resolve()
    }
  }

  /** Resolves once no work is in flight (immediately if already idle). */
  whenIdle(): Promise<void> {
    if (this.count === 0) return Promise.resolve()
    return new Promise<void>((resolve) => this.idleResolvers.push(resolve))
  }
}
