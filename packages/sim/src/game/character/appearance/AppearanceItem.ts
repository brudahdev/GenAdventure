import { AppearanceItemConfig } from "@gen-adventure/shared";
import { PromptBuilder } from "../../../core/PromptBuilder";

export class AppearanceItem {
    private isCoveredByClothing = false;
    private isCoveredByPose = false;

    constructor(private config: AppearanceItemConfig) { }

    get id(): string {
        return this.config.id;
    }

    get class(): string | undefined {
        return this.config.class;
    }

    get img_txt(): string | undefined {
        return this.config.img_txt;
    }

    get img_txt_neg(): string | undefined {
        return this.config.img_txt_neg;
    }

    get ctx_txt() {
        return this.config.ctx_txt
    }

    getIsCoveredByPose() {
        return this.isCoveredByPose;
    }

    setIsCoveredByPose(val: boolean) {
        this.isCoveredByPose = val;
    }

    getIsCoveredByClothing() {
        return this.isCoveredByClothing;
    }

    setIsCoveredByClothing(val: boolean) {
        this.isCoveredByClothing = val;
    }

    isVisible() {
        let coveredByClothing = this.isCoveredByClothing;
        if (this.config.ingnore_clothing_covering == true) {
            coveredByClothing = false;
        }
        // return !coveredByClothing && !this.isCoveredByPose && !this.isCoveredByInteraction;
        return !coveredByClothing && !this.isCoveredByPose;
    }


    public buildImagePrompt(prompt: PromptBuilder) {
        if (!this.isVisible()) return;

        if (this.img_txt) {
            prompt.addToPos(this.img_txt);
        }
        if (this.img_txt_neg) {
            prompt.addToNeg(this.img_txt_neg);
        }
    }
}