import { BrowserWindow, ipcMain } from 'electron'
import { container, singleton } from 'tsyringe'

import { ChatService } from './ChatService'
import { ScenarioService } from '../scenario/ScenarioService'
import { ICP } from '../../../../../shared/src/icp'

const chatService = container.resolve(ChatService)
const scenarioService = container.resolve(ScenarioService)

/**
 * Application layer for the chat feature: bridges renderer IPC to ChatService.
 * User messages flow renderer → here → ChatService → Voxta; assembled character
 * messages flow ChatService → here → renderer (pushed over CHAT_MESSAGE).
 */
@singleton()
export class ChatIpcHandlers {
    constructor() {
        ipcMain.handle(ICP.CHAT_SEND, async (_, text: string) => {
            return chatService.sendUserMessage(text)
        })

        ipcMain.handle(ICP.CHAT_QUIT, async () => {
            return scenarioService.endScenario()
        })

        // Push assembled character messages to every open window.
        chatService.onChatMessage((message) => {
            for (const win of BrowserWindow.getAllWindows()) {
                win.webContents.send(ICP.CHAT_MESSAGE, message)
            }
        })

        // Push partial ASR text to every open window.
        chatService.onPartialText((text) => {
            for (const win of BrowserWindow.getAllWindows()) {
                win.webContents.send(ICP.CHAT_PARTIAL, text)
            }
        })
    }
}
