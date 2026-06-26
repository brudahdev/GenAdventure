import { SimContextItem, NpcActivationChange, InferenceAction, PromptRequest } from "@gen-adventure/shared"
import { Notif } from "../core/NotificationService"

export interface GameEvents {
    "time.tick": {
        deltaMs: number
        gameTimeMs: number
    },

    "time.second": {
        gameTimeMs: number
    },

    "location.changed": LocationChangedEvent

    "pose.changed": {
        characterId: string
        poseId: string
    },

    "clothing.state.changed": {
        characterId: string
        clothingId: string
    },

    "character.initialized": {
        characterId: string
    },

    "npc.activation.changed": NpcActivationChange,

    "context": SimContextItem,

    "inference.action.sync": InferenceAction,

    "image.request": PromptRequest,

    "notification": Notif,//pushed by notification system
    "notification.add": Notif,//pushed by things to send to notification.... probably bad but im lazy todo remove this
}

export interface LocationChangedEvent {
    characterId: string
    locationId: string
    subLocationId: string
    previousLocationId?: string;
    previousSubLocationId?: string;
}