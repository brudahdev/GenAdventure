export class PromptBuilder {
    private positive: string = '';
    private negative: string = '';

    private seperator: string;
    private reversed: boolean;

    constructor(seperator: string = '', reversed: boolean = false) {
        this.seperator = seperator;
        this.reversed = reversed;
    }

    flipReveresed() {
        this.reversed = !this.reversed
    }

    private addText(current: string, txt: string, useSeperator: boolean = true): string {
        if (!current) {
            return txt;
        }
        if (this.reversed) {
            // Prepend
            return txt + (useSeperator ? this.seperator : '') + current;
        } else {
            // Append
            return current + (useSeperator ? this.seperator : '') + txt;
        }
    }

    addToPos(txt?: string, useSeperator = true) {
        if (!txt) {
            return;
        }
        this.positive = this.addText(this.positive, txt, useSeperator);
    }

    addToNeg(txt?: string) {
        if (!txt) {
            return;
        }
        this.negative = this.addText(this.negative, txt);
    }

    public getPositive() {
        return this.positive;
    }
    public getNegative() {
        return this.negative;
    }
}