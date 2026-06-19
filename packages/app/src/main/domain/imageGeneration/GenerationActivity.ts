import { singleton } from 'tsyringe'

/**
 * Intent-level counter of scene image-generation work in flight, used so a scene
 * transition can stay black until *every* image it triggers is ready — not just
 * the background.
 *
 * Callers `begin()` the moment they know work is coming (synchronously, before any
 * `await` such as a Voxta call or an enqueue) and `end()` in a `finally`. This is
 * deliberately decoupled from {@link ImageGenerationService}'s queue: the queue only
 * knows about work once it's enqueued, which can lag behind the activation that
 * triggers it — so it can look momentarily idle mid-transition. The counter, seeded
 * at intent time, has no such gap.
 */
@singleton()
export class GenerationActivity {
  private count = 0
  private idleResolvers: (() => void)[] = []

  /** Register one unit of pending work. Call before any `await`. */
  begin(): void {
    this.count++
  }

  /** Mark one unit of work done; wakes `whenIdle()` waiters when the count hits 0. */
  end(): void {
    if (this.count > 0) this.count--
    if (this.count === 0) {
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
