import type { Endpoint } from 'comlink'
import type { MessagePort, Worker } from 'worker_threads'

/**
 * Adapts a `worker_threads` {@link Worker}/{@link MessagePort} to Comlink's
 * {@link Endpoint} interface (which is modelled on the DOM `MessagePort`).
 *
 * Vendored rather than imported from `comlink/dist/umd/node-adapter` so we don't
 * depend on a deep import path. Kept out of the package barrel (`index.ts`) so
 * the renderer bundle never pulls in `worker_threads`.
 */
export function nodeEndpoint(port: Worker | MessagePort): Endpoint {
  const listeners = new WeakMap<
    EventListenerOrEventListenerObject,
    (data: unknown) => void
  >()

  return {
    postMessage: (message, transfer) =>
      // worker_threads expects a transferList of ArrayBuffer/MessagePort, not
      // the DOM `Transferable[]` Comlink types it as.
      port.postMessage(message, transfer as unknown as readonly never[]),
    addEventListener: (_type, listener) => {
      const onMessage = (data: unknown): void => {
        if ('handleEvent' in listener) {
          listener.handleEvent({ data } as MessageEvent)
        } else {
          listener({ data } as MessageEvent)
        }
      }
      port.on('message', onMessage)
      listeners.set(listener, onMessage)
    },
    removeEventListener: (_type, listener) => {
      const onMessage = listeners.get(listener)
      if (!onMessage) return
      port.off('message', onMessage)
      listeners.delete(listener)
    }
  }
}
