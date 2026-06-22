import { SubLocationConfig, Taggable } from "@gen-adventure/shared";
import type { Entity } from "../../core/ec/Entity";
import { Location } from "./Location";
import { LocationBase } from "./LocationBase";
import { PromptBuilder } from "../../core/PromptBuilder";


export class SubLocation extends LocationBase implements Taggable {

    constructor(private parent: Location, private config: SubLocationConfig) {
        super()
    }

    get id() {
        return this.config.id;
    }

    get tags() {
        return this.config.tags
    }

    get excludeTags() {
        return this.config.excludeTags
    }

    get onEnterText(){
        return this.config.onEnterText
    }

    getParent() {
        return this.parent;
    }

    onCharacterEnter(entity: Entity) {
        super.onCharacterEnter(entity);
        this.parent.onCharacterEnter(entity);
    }

    onCharacterExit(entity: Entity) {
        super.onCharacterExit(entity);
        this.parent.onCharacterExit(entity);
    }

    getPoseConfigById(poseId: string) {
        return this.config.poses.find(poseConfig => poseConfig.poseId == poseId)
    }

    getLocationPath() {
        return `${this.parent.id}/${this.id}`
    }

    getPoseImagePrompt(poseId: string) {
        const prompt = new PromptBuilder();
        const poseConfig = this.config.poses?.find(p => p.poseId === poseId);
        if (poseConfig) {
            prompt.addToPos(poseConfig.img_txt);
            prompt.addToNeg(poseConfig.img_txt_neg);
        }
        return prompt;
    }

    getPoseContextPromptById(poseId: string) {
        const poseConfig = this.config.poses?.find(p => p.poseId === poseId);
        if (poseConfig && poseConfig.context) {
            return poseConfig.context
        }
        return '';
    }

    getPoseOptions(): string[] {
        return this.config.poses.map(locPose => locPose.poseId)
    }

}
