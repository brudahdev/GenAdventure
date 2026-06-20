import { SimContextItem, NpcActivationChange, InferenceAction, PromptRequest } from "@gen-adventure/shared"

export interface GameEvents {
    "time.tick": {
        deltaMs: number
        gameTimeMs: number
    },

    "time.second": {
        gameTimeMs: number
    },

    "location.changed": {
        characterId: string
        locationId: string
        subLocationId: string
        previousLocationId?: string;
        previousSubLocationId?: string;
    },

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
}