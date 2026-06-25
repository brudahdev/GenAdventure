export class TimeUtils {
    static formatDateTime(
        date: Date,
        yearOffset: number = 0,
        includeSeconds: boolean = false
    ): string {

        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        const day = date.getDate();
        const year = date.getFullYear() + yearOffset;

        const month = months[date.getMonth()];

        const suffix =
            (day % 10 === 1 && day !== 11) ? "st" :
                (day % 10 === 2 && day !== 12) ? "nd" :
                    (day % 10 === 3 && day !== 13) ? "rd" :
                        "th";

        let hours = date.getHours();

        const minutes = date.getMinutes();
        const seconds = date.getSeconds();

        const ampm =
            hours >= 12 ? "pm" : "am";

        hours = hours % 12;

        if (hours === 0) {
            hours = 12;
        }

        const minuteStr =
            String(minutes).padStart(2, "0");

        const secondStr =
            String(seconds).padStart(2, "0");

        const timeStr =
            includeSeconds
                ? `${hours}:${minuteStr}:${secondStr}${ampm}`
                : `${hours}:${minuteStr}${ampm}`;

        return `${month} ${day}${suffix}, ${year} ${timeStr}`;
    }


    static secondsToMs(seconds: number) {
        return seconds * 1000;
    }

    static msToSeconds(ms: number) {
        return ms / 1000;
    }

    static minutesToMs(minutes: number) {
        return this.secondsToMs(minutes * 60);
    }

    static msToMinutes(ms: number) {
        return this.msToSeconds(ms) / 60;
    }

    static hoursToMs(hours: number) {
        return this.minutesToMs(hours * 60);
    }

    static msToHours(ms: number) {
        return this.msToMinutes(ms) / 60;
    }

    static daysToMs(days: number) {
        return this.hoursToMs(days * 24);
    }

    static msToDays(ms: number) {
        return this.msToHours(ms) / 24;
    }


}