import { Lifecycle, scoped } from "tsyringe";
import { EventSystem } from "../game/EventSystem";

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




export interface Notif {
    text: string,
    characterIds: string[],
    actorInfo?: {
        text: string,
        actorId: string,
    }
}