export class Logger {
    loggerName: string;

    private static lastDate = ""
    static getDate?: () => string;

    constructor(loggerName: string) {
        this.loggerName = loggerName;
    }

    info(msg?: string): void {
        if (!msg)
            return;
        this.log(`[INFO] ${this.loggerName}: ${msg}`);
    }

    warn(msg?: string): void {
        if (!msg)
            return;
        this.log(`[WARN] ${this.loggerName}: ${msg}`);
    }

    debug(msg?: string): void {
        if (!msg)
            return;
        this.log(`[DEBUG] ${this.loggerName}: ${msg}`);
    }

    error(msg?: string): void {
        if (!msg)
            return;
        this.log(`[ERROR] ${this.loggerName}: ${msg}`);
    }


    private log(msg: string): void {

        const date = Logger.getDate?.() ?? "";
        if (Logger.lastDate != date) {
            console.log(date);
            console.log("\n");
            Logger.lastDate = date;
        }
        console.log(msg);
        console.log("\n");


    }
}