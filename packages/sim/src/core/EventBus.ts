import { Logger } from "./Logger"

type EventHandler<T> = (payload: T) => void
type EventMap = Record<string, any>

/** A registered handler plus its dispatch order (lower runs first). */
interface HandlerEntry<T> {
    handler: EventHandler<T>
    order: number
}


export class EventBus<Events extends EventMap> {
    private logger = new Logger("EventBus")

    private listeners: Partial<{
        [K in keyof Events]: HandlerEntry<Events[K]>[]
    }> = {}

    /**
     * Subscribe to an event. `order` controls dispatch order among handlers of the
     * same event — **lower runs first** (default `0`). Handlers with equal order keep
     * registration order (stable sort).
     */
    on<K extends keyof Events>(
        event: K,
        handler: EventHandler<Events[K]>,
        order = 0
    ): () => void {
        let list = this.listeners[event]

        if (!list) {
            list = []
            this.listeners[event] = list
        }

        list.push({ handler, order })
        list.sort((a, b) => a.order - b.order)

        return () => this.off(event, handler)
    }

    off<K extends keyof Events>(
        event: K,
        handler: EventHandler<Events[K]>
    ) {
        const list = this.listeners[event]
        if (!list) return
        const i = list.findIndex(entry => entry.handler === handler)
        if (i !== -1) list.splice(i, 1)
    }

    emit<K extends keyof Events>(
        event: K,
        payload: Events[K]
    ) {
        const list = this.listeners[event]

        if (!list || list.length === 0) {
            return
        }

        // Snapshot so a handler that (un)subscribes mid-emit doesn't disturb dispatch.
        for (const entry of [...list]) {
            try {
                entry.handler(payload)
            } catch (err) {
                this.logger.error(
                    `Error in handler for event ${String(event)}: ${err}`
                )
            }
        }
    }

    clear<K extends keyof Events>(event?: K) {
        if (event) {
            this.listeners[event] = []
        } else {
            this.listeners = {}
        }
    }
}
