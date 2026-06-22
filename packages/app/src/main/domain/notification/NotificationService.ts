import { singleton, container } from "tsyringe"
import { PLAYER_CHARACTER_ID, type Notif } from "@gen-adventure/shared"
import { VoxtaClient } from "../../integration/voxta/voxtaClient"

const voxtaClient = container.resolve(VoxtaClient)

/** Turns sim notifications (witnessed actions) into Voxta messages.
 *  Non-player witnesses get a `/secret` event; the player gets an
 *  `/instructions` message. `actorInfo` is intentionally unused for now. */
@singleton()
export class NotificationService {
    onNotification(notif: Notif): void {
        const hasNonPlayer = notif.characterIds.some((id) => id !== PLAYER_CHARACTER_ID)
        if (hasNonPlayer) {
            void voxtaClient.sendUserMessage(`/secret ${notif.text}`)
        }
        if (notif.characterIds.includes(PLAYER_CHARACTER_ID)) {
            void voxtaClient.sendUserMessage(`/instructions ${notif.text}`)
        }
    }
}
