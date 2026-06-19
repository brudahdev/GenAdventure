import Store from 'electron-store'

/**
 * Shape persisted by electron-store. The API key is stored only as ciphertext
 * (`apiKeyEnc`, base64 of safeStorage.encryptString) — never in plaintext.
 */
interface PersistedSchema {
  voxta: {
    url: string
    apiKeyEnc: string
  }
}

/** Single electron-store instance for the whole app (main process only). */
export const store = new Store<PersistedSchema>({
  defaults: {
    voxta: {
      url: '',
      apiKeyEnc: ''
    }
  }
})
