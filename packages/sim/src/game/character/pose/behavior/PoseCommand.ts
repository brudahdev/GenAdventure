
// --- Commands ---

import { pending, type Command } from "../../../../core/plan/planTypes";

export const POSE_COMMAND = 'poseCmd'

export interface PoseCommand extends Command {
    type: typeof POSE_COMMAND
    actorId: string
    targetId: string
    poseId: string
}

export const poseCommand = (actorId: string, targetId: string, poseId: string): PoseCommand => ({
    kind: 'command',
    type: POSE_COMMAND,
    status: pending(),
    actorId,
    targetId,
    poseId,
})

