import { Lifecycle, scoped } from "tsyringe";
import type { Notif } from "@gen-adventure/shared";
import { EventSystem } from "../game/EventSystem";

export type { Notif } from "@gen-adventure/shared";

@scoped(Lifecycle.ContainerScoped)
export class NotificationService {
    private enabled = false;

    constructor(
        private readonly eventSystem: EventSystem
    ) {
        this.eventSystem.on("notification.add", (notif) => {
            this.send(notif)
        })

    }

    activate() {
        this.enabled = true;
    }

    deactivate() {
        this.enabled = false;
    }


    send(notification: Notif | undefined) {
        if (!notification || !this.enabled) {
            return;
        }
        console.log(JSON.stringify(notification))
        this.eventSystem.emit("notification", notification)
    }

}
