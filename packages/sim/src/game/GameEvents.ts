import { SimContextItem } from "@gen-adventure/shared"
import { NpcActivationChange } from "./character/npc/NpcActivity"

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
}