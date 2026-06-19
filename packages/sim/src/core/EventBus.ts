import { Logger } from "./Logger"

type EventHandler<T> = (payload: T) => void
type EventMap = Record<string, any>


export class EventBus<Events extends EventMap> {
    private logger = new Logger("EventBus")

    private listeners: Partial<{
        [K in keyof Events]: Set<EventHandler<Events[K]>>
    }> = {}

    on<K extends keyof Events>(
        event: K,
        handler: EventHandler<Events[K]>
    ): () => void {
        let set = this.listeners[event]

        if (!set) {
            set = new Set()
            this.listeners[event] = set
        }

        set.add(handler)

        return () => this.off(event, handler)
    }

    off<K extends keyof Events>(
        event: K,
        handler: EventHandler<Events[K]>
    ) {
        this.listeners[event]?.delete(handler)
    }

    emit<K extends keyof Events>(
        event: K,
        payload: Events[K]
    ) {
        const set = this.listeners[event]

        if (!set || set.size === 0) {
            return
        }

        set.forEach(handler => {
            try {
                handler(payload)
            } catch (err) {
                this.logger.error(
                    `Error in handler for event ${String(event)}: ${err}`
                )
            }
        })
    }

    clear<K extends keyof Events>(event?: K) {
        if (event) {
            this.listeners[event]?.clear()
        } else {
            this.listeners = {}
        }
    }
}
