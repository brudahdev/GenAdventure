import { Lifecycle, scoped } from "tsyringe";
import type { Notif } from "@gen-adventure/shared";
import { EventSystem } from "../game/EventSystem";

export type { Notif } from "@gen-adventure/shared";

@scoped(Lifecycle.ContainerScoped)
export class NotificationService {
    private enabled = true;

    constructor(private readonly eventSystem: EventSystem) { }


    send(notification: Notif | undefined) {
        if (!notification || !this.enabled) {
            return;
        }
        this.eventSystem.emit("notification", notification)
    }

}