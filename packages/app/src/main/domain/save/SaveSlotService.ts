import { container, singleton } from 'tsyringe'
import { parseManifest, type SaveSlotInfo } from '@gen-adventure/shared'
import { SaveDataService } from './SaveDataService'

const saveDataService = container.resolve(SaveDataService)

/** Root (relative to save_data) under which all game saves live. */
const SAVES_ROOT = 'saves'

/**
 * Discovers saved games on disk. Saves are laid out as a folder
 * `saves/<scenarioId>/<saveName>/` holding `manifest.json` (the small listing
 * summary) + `game.json` (the body). Listing reads only `manifest.json`; saves
 * predating the manifest fall back to a one-time read of `game.json`.
 * Malformed saves are skipped.
 */
@singleton()
export class SaveSlotService {
    /** Every save on disk, across all scenarios. */
    async listAll(): Promise<SaveSlotInfo[]> {
        const out: SaveSlotInfo[] = []
        const scenarioIds = await saveDataService.listDirs(SAVES_ROOT)

        for (const scenarioId of scenarioIds) {
            const saveNames = await saveDataService.listDirs(`${SAVES_ROOT}/${scenarioId}`)
            for (const saveName of saveNames) {
                const info = await this.readSlot(scenarioId, saveName)
                if (info) out.push(info)
            }
        }
        return out
    }

    private async readSlot(
        scenarioId: string,
        saveName: string,
    ): Promise<SaveSlotInfo | null> {
        const dir = `${SAVES_ROOT}/${scenarioId}/${saveName}`
        const gameJsonPath = `${dir}/game.json`

        // Prefer the cheap manifest; fall back to the body for pre-manifest saves.
        let raw = await saveDataService.read(`${dir}/manifest.json`)
        if (!raw) raw = await saveDataService.read(gameJsonPath)
        if (!raw) return null

        const manifest = parseManifest(raw)
        if (!manifest) return null // legacy/malformed save without a usable summary

        // Manifests written by this build carry savedAt; older ones fall back to mtime.
        const savedAt = manifest.savedAt || (await saveDataService.mtimeMs(gameJsonPath)) || 0
        return {
            scenarioId,
            saveName,
            chatId: manifest.chatId,
            slot: manifest.slot,
            gameTimeMs: manifest.gameTimeMs,
            gameJsonPath,
            savedAt,
        }
    }
}
