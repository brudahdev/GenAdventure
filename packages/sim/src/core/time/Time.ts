import { inject, Lifecycle, scoped } from "tsyringe";
import { TIME_CONFIG_ADAPTER, timeConfigToMs, type TimeConfigAdapter } from "./TimeConfigAdapter";
import type { GameSystem } from "../GameSystem";
import type { WorldSaveable } from "../save/Saveable";
import { RESTORE_SOURCE, RestoreSource } from "../save/RestoreSource";
import { EventSystem } from "../../game/EventSystem";

const TICKS_PER_SECOND = 30;

/** {@link Time}'s world save blob: the absolute in-game time. */
interface TimeSave { gameTimeMs: number }

@scoped(Lifecycle.ContainerScoped)
export class Time implements GameSystem, WorldSaveable<TimeSave> {
    readonly saveKey = 'time'

    private lastReal = Date.now();
    private gameTime = this.lastReal;
    private lastSecond = 0;
    private intervalHandle: ReturnType<typeof setInterval> | null = null;

    constructor(
        @inject(TIME_CONFIG_ADAPTER) private readonly config: TimeConfigAdapter,
        @inject(RESTORE_SOURCE) restore: RestoreSource,
        private readonly eventSystem: EventSystem,
    ) {
        // Resume from the saved instant, else start from scenario time config.
        this.gameTime = restore.forWorld<TimeSave>(
            this.saveKey,
            () => ({ gameTimeMs: timeConfigToMs(this.config.getConfig()) }),
        ).gameTimeMs;

        this.config.saveTime(this.gameTime)
        console.log('[sim] Time manager initialized with time: ' + this.formatGameTime())
    }

    getTimeMs(): number { return this.gameTime }

    save(): TimeSave { return { gameTimeMs: this.gameTime } }

    dispose(): void {
        this.pause()
    }

    resume() {
        if (this.intervalHandle !== null) return;
        this.lastReal = Date.now();
        this.intervalHandle = setInterval(() => this.tick(),
            Math.floor(1000 / TICKS_PER_SECOND));
        console.log('[sim] time resumed')
    }

    pause() {
        if (this.intervalHandle !== null) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
        console.log('[sim] time paused')
    }

    private tick(): void {
        const now = Date.now();
        const delta = now - this.lastReal;
        this.lastReal = now;
        this.gameTime += delta;
        // console.log("delta time " + delta)

        this.eventSystem.emit("time.tick", { deltaMs: delta, gameTimeMs: this.gameTime })

        this.lastSecond += delta
        if (this.lastSecond >= 1000) {
            this.lastSecond -= 1000;
            this.onSecond();
        }
    }

    private onSecond(): void {
        this.eventSystem.emit("time.second", { gameTimeMs: this.gameTime })
    }

    private formatGameTime(): string {
        const date = new Date(this.gameTime);

        const month = date.toLocaleString('en-US', { month: 'long' });
        const day = date.getDate();
        const year = date.getFullYear();

        const ordinal = this.getOrdinal(day);

        return `${month} ${day}${ordinal}, ${year}`;
    }

    private getOrdinal(day: number): string {
        if (day >= 11 && day <= 13) return 'th';

        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }
}
