/**
 * Reject if `promise` doesn't settle within `ms`. Use to bound an RPC call that
 * expects a response — a hung/dead worker never replies, so the timer is the
 * safety net. The timer is always cleared, so a settled promise never leaks one.
 *
 * Only wrap calls you actually `await` for a result; leaving a slow
 * fire-and-forget call unwrapped avoids an unhandled rejection from the timer.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'RPC call'): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>
}
