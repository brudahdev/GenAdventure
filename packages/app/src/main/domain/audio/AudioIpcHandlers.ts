import { BrowserWindow, ipcMain } from 'electron'
import { container, singleton } from 'tsyringe'
import type { AudioStartedAck, AudioCompleteAck } from '@gen-adventure/shared'

import { AudioService } from './AudioService'
import { ICP } from '../../../../../shared/src/icp'

const audioService = container.resolve(AudioService)

/** Broadcast a payload to every open window. */
function broadcast(channel: string, payload?: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(channel, payload)
    }
}

/**
 * Application layer for the audio feature: bridges renderer IPC to AudioService.
 * Playback chunks, stop, and recording start/stop are pushed main → renderer;
 * the renderer reports playback started/complete back via invoke.
 */
@singleton()
export class AudioIpcHandlers {
    constructor() {
        // Renderer → main: playback acks (relayed to Voxta).
        ipcMain.handle(ICP.AUDIO_STARTED, async (_, ack: AudioStartedAck) => {
            audioService.audioStarted(ack)
        })
        ipcMain.handle(ICP.AUDIO_COMPLETE, async (_, ack: AudioCompleteAck) => {
            audioService.audioComplete(ack)
        })

        // Main → renderer: ordered TTS chunks, reply-complete, interrupt, mic start/stop.
        audioService.onPlayAudio((chunk) => broadcast(ICP.AUDIO_PLAY, chunk))
        audioService.onReplyEnd((event) => broadcast(ICP.AUDIO_REPLY_END, event))
        audioService.onStopAudio(() => broadcast(ICP.AUDIO_STOP))
        audioService.onRecordingStart((event) => broadcast(ICP.AUDIO_RECORDING_START, event))
        audioService.onRecordingStop(() => broadcast(ICP.AUDIO_RECORDING_STOP))
    }
}
