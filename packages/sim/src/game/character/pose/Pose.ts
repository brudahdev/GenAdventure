import { PoseConfig } from "@gen-adventure/shared";

export class Pose {
    constructor(private config: PoseConfig) { }

    get id(): string { return this.config.id }

    get occludedAppearanceClasses() {
        return this.config.occludedAppearanceClasses
    }
}