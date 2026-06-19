import { safeStorage } from 'electron'
import { DEFAULT_VOXTA_URL } from '@gen-adventure/shared'
import type { VoxtaConfig, PublicVoxtaConfig } from '@gen-adventure/shared'
import { store } from '../../../store'

/**
 * Voxta config source of truth. Owns encryption of the API key via safeStorage.
 *
 * Decryption stays inside the main process: `getDecrypted()` is for main-only
 * consumers (the Voxta client). The renderer only ever sees `getPublic()`.
 */

// electron-store's dotted-path get() loses the value type, so read fields explicitly.
const getUrl = (): string => store.get('voxta.url') as string
const getApiKeyEnc = (): string => store.get('voxta.apiKeyEnc') as string

function decryptApiKey(): string {
  const enc = getApiKeyEnc()
  if (!enc || !safeStorage.isEncryptionAvailable()) return ''
  try {
    return safeStorage.decryptString(Buffer.from(enc, 'base64'))
  } catch {
    // Stored ciphertext can't be decrypted (e.g. different OS user/keychain). Treat as unset.
    return ''
  }
}

/** Full config including the plaintext key. MAIN PROCESS ONLY — never send over IPC. */
export function getDecrypted(): VoxtaConfig {
  return {
    url: getUrl() || DEFAULT_VOXTA_URL,
    apiKey: decryptApiKey()
  }
}

/** What the renderer is allowed to see: the URL and whether a key exists. */
export function getPublic(): PublicVoxtaConfig {
  return {
    url: getUrl() || DEFAULT_VOXTA_URL,
    hasApiKey: decryptApiKey().length > 0
  }
}

/**
 * Persist config from the renderer. The URL is always written. The API key is
 * only written when a non-empty value is provided — a blank key field means
 * "keep the existing key", not "clear it".
 */
export function set(config: VoxtaConfig): void {
  store.set('voxta.url', config.url)

  if (config.apiKey && safeStorage.isEncryptionAvailable()) {
    const enc = safeStorage.encryptString(config.apiKey).toString('base64')
    store.set('voxta.apiKeyEnc', enc)
  }
}
