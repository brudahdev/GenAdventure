import { BrowserWindow } from 'electron'
import { singleton } from "tsyringe";
import { ICP } from '../../../../../shared/src/icp'

@singleton()
export class TimeService {
    constructor() {}

    onGameTimeUpdate(time: number) {
        for (const win of BrowserWindow.getAllWindows())
            win.webContents.send(ICP.TIME_UPDATE, time)
    }
}