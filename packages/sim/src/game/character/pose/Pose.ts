import { PoseConfig, Taggable } from "@gen-adventure/shared";

export class Pose implements Taggable {
    constructor(private config: PoseConfig) { }

    get id(): string { return this.config.id }

    get occludedAppearanceClasses() {
        return this.config.occludedAppearanceClasses
    }

    get tags() {
        return this.config.tags
    }
    get excludeTags() {
        return this.config.excludeTags
    }
}