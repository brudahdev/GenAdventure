import { singleton } from 'tsyringe'
import { SimManager } from '../sim/SimManager'
import { OverlayService } from '../overlay/OverlayService'

/**
 * Single owner of the "scene is loading" state for runtime image generation:
 * an in-flight counter that also pauses the sim and shows the loading overlay
 * while any work is outstanding, and resumes + hides once everything is done.
 *
 * Callers `begin(label)` the moment they know work is coming (synchronously,
 * before any `await` such as a Voxta call or an enqueue) and `end()` in a
 * `finally`. Because a location change generates the background *and* the
 * activating NPCs' avatars concurrently — each via its own service — centralising
 * the pause/overlay here means they're torn down only when the **last** unit
 * finishes, not when whichever finishes first runs its `finally`. `whenIdle()`
 * lets the transition hold the black until all of it is done.
 *
 * Scenario start does not go through here (it generates while the sim is paused
 * by default and drives its own overlay), so its flow is unaffected.
 */
@singleton()
export class GenerationActivity {
  private count = 0
  private idleResolvers: (() => void)[] = []

  constructor(
    private readonly sim: SimManager,
    private readonly overlay: OverlayService
  ) {}

  /** Register one unit of pending work; pauses the sim + shows the overlay (with
   *  `label`) on the first unit. Call before any `await`. */
  begin(label?: string): void {
    this.count++
    if (this.count === 1) this.sim.pauseTime()
    this.overlay.show(label)
  }

  /** Mark one unit done; on the last unit resumes the sim, hides the overlay, and
   *  wakes `whenIdle()` waiters. */
  end(): void {
    if (this.count === 0) return
    this.count--
    if (this.count === 0) {
      this.sim.resumeTime()
      this.overlay.hide()
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
