/**
 * Local types for the spatial audio engine. The engine carries spatial-panning,
 * distance, cave-reverb, and echo capabilities, but GenAdventure does NOT wire a
 * position/settings source to it yet — it plays through the effects chain at inert
 * defaults. These types exist so a future change can feed it position/settings data.
 */

/** A listener/source position used for distance attenuation + stereo panning. */
export interface SpatialPosition {
    inCave: boolean
    botX: number
    botY: number
    botZ: number
    playerX: number
    playerY: number
    playerZ: number
    playerYaw: number
}

/** Tunables for the spatial/reverb/echo effects chain. */
export interface AudioEffectSettings {
    enableSpatialAudio: boolean
    spatialNearDistance: number
    spatialMaxDistance: number
    enableAutoCaveEffects: boolean
    enableReverb: boolean
    reverbAmount: number
    reverbDecay: number
    enableEcho: boolean
    echoDelay: number
    echoDecay: number
}
