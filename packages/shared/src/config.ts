/** Voxta connection settings. The source of truth lives in the Electron main process. */
export interface VoxtaConfig {
  url: string
  apiKey: string
}

/** Default Voxta hub URL used when no value has been saved yet. */
export const DEFAULT_VOXTA_URL = 'http://localhost:5384/hub'

/**
 * What the renderer is allowed to know about the Voxta config.
 * The API key plaintext never crosses the IPC boundary — only whether one is set.
 */
export interface PublicVoxtaConfig {
  url: string
  hasApiKey: boolean
}
