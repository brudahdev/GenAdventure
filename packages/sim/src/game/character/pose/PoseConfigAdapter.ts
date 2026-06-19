import { PoseConfig } from "@gen-adventure/shared"
import { readJsonConfig } from "../../../core/config/readJsonConfig";
import { indexById, type IndexedById } from "../../../core/config/indexById";

export const POSE_CONFIG_ADAPTER = 'PoseConfigAdapter'

export interface PoseConfigAdapter {
    getPoseConfig(poseId: string): PoseConfig | undefined
    getConfigs(): PoseConfig[]
}


export class FilePoseConfigAdapter implements PoseConfigAdapter {
    private readonly poses: IndexedById<PoseConfig>

    constructor(poseConfigLocation: string) {
        this.poses = indexById(
            readJsonConfig<PoseConfig[]>(poseConfigLocation, 'pose config'),
            'pose',
        )
    }

    getPoseConfig(poseId: string) {
        return this.poses.get(poseId)
    }

    getConfigs() {
        return this.poses.all()
    }
}
