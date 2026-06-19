import { TimeConfig } from "@gen-adventure/shared";
import { readJsonConfig } from "../config/readJsonConfig";
import { scenarioConfigPath } from "../config/scenarioConfigPath";

export const TIME_CONFIG_ADAPTER = 'TimeConfigAdapter'

export interface TimeConfigAdapter {
    getConfig(): TimeConfig
    saveTime(time: number): void
}

export const DEFAULT_CONFIG: TimeConfig = {
    useCurrentTime: true,
    am: true,
    minute: 0,
    hour: 8,
    day: 13,
    month: 12,
    year: 200
}

/** Converts a `TimeConfig` to an absolute timestamp (ms): am/pm + 1..12 hour → 24h. */
export function timeConfigToMs(config: TimeConfig): number {
    if (config.useCurrentTime) {
        return Date.now()
    }

    const hour24 = config.am
        ? (config.hour % 12)
        : (config.hour % 12) + 12

    return new Date(
        config.year,
        config.month - 1,
        config.day,
        hour24,
        config.minute,
        0,
        0
    ).getTime()
}

/** Reads `<scenariosConfigDirectory>/<scenarioId>/time.json` (a flat `TimeConfig`)
 *  and returns it, falling back to the default config when missing/unreadable. */
export class FileTimeConfigAdapter implements TimeConfigAdapter {
    private config: TimeConfig | null = null

    constructor(
        private readonly scenariosConfigDirectory: string,
        private readonly scenarioId: string
    ) { }

    getConfig(): TimeConfig {
        if (!this.config) {
            try {
                const path = scenarioConfigPath(this.scenariosConfigDirectory, this.scenarioId, 'time.json')
                this.config = { ...DEFAULT_CONFIG, ...readJsonConfig<Partial<TimeConfig>>(path, 'time config') }
            } catch {
                this.config = DEFAULT_CONFIG
            }
        }
        return this.config
    }

    saveTime(_time: number) {
        //todo
    }
}
