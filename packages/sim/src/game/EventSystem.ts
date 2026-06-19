import { Lifecycle, scoped } from "tsyringe"
import { EventBus } from "../core/EventBus"
import type { GameSystem } from "../core/GameSystem"
import { GameEvents } from "./GameEvents"


@scoped(Lifecycle.ContainerScoped)
export class EventSystem extends EventBus<GameEvents> implements GameSystem {
    dispose(): void {
        this.clear()
    }
}
