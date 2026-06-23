
import { PoseMatrixConfig, TouchDuoConfig } from "./config/TouchConfigs";


type PoseKey = 'actorPoseIds' | 'targetPoseIds';



export class TouchValidator { //leave this out for now claude
    constructor(
        // private character: Character
    ) {

    }

    // poseInteractionMatrixCheck(
    //     interaction: TouchDuoConfig,
    //     targetCharacter: Character
    // ): boolean {

    //     const poseMatrix = interaction.poseMatrix;

    //     if (!poseMatrix) {
    //         return true;
    //     }

    //     const actorPose = this.character.pose.getCurrentPose();
    //     const targetPose = targetCharacter.pose.getCurrentPose();

    //     if (!actorPose || !targetPose) {
    //         return false;
    //     }

    //     // Pass 1:
    //     // Match target pose -> try changing actor pose
    //     const actorSucceeded = this.tryPoseMatrixDirection(
    //         poseMatrix,
    //         targetPose.id,
    //         actorPose.id,
    //         'targetPoseIds',
    //         'actorPoseIds',
    //         this.character,
    //         this.character
    //     );

    //     if (actorSucceeded) {
    //         return true;
    //     }

    //     // Pass 2:
    //     // Match actor pose -> try changing target pose
    //     const targetSucceeded = this.tryPoseMatrixDirection(

    //         poseMatrix,
    //         actorPose.id,
    //         targetPose.id,
    //         'actorPoseIds',
    //         'targetPoseIds',
    //         targetCharacter,
    //         this.character
    //     );

    //     if (targetSucceeded) {
    //         return true;
    //     }

    //     console.log(
    //         `touch interaction ${interaction.id} failed pose matrix check`
    //     );

    //     return true;///todo it failed, return false, disabled
    // }


    // private tryPoseMatrixDirection(

    //     poseMatrix: PoseMatrixConfig[],
    //     currentMatchPoseId: string,
    //     currentChangePoseId: string,
    //     matchKey: PoseKey,
    //     changeKey: PoseKey,
    //     moveCharacter: Character,
    //     movedByCharacter: Character
    // ): boolean {

    //     const matchingRow =
    //         poseMatrix.find(row =>
    //             row[matchKey].includes(currentMatchPoseId)
    //         ) ??
    //         poseMatrix.find(row =>
    //             row[matchKey].includes('any')
    //         );

    //     // No restriction for this pose
    //     if (!matchingRow) {
    //         return true;
    //     }

    //     const allowedChangePoses = matchingRow[changeKey];

    //     // Explicitly unsupported
    //     if (allowedChangePoses.length === 0) {
    //         return false;
    //     }

    //     // Already compatible
    //     if (
    //         allowedChangePoses.includes(currentChangePoseId) ||
    //         allowedChangePoses.includes('any')
    //     ) {
    //         return true;
    //     }

    //     // Try all compatible poses
    //     for (const poseId of allowedChangePoses) {

    //         if (poseId === 'any') {
    //             return true;
    //         }

    //         // const poseSet = moveCharacter.poseManager.setPoseById(
    //         //     movedByCharacter,
    //         //     poseId
    //         // );
    //         // if (poseSet) { todo
    //         //     return true;
    //         // }
    //     }

    //     return false;
    // }

    private onPoseChanged() {//todo subscribe to event
        // this.character.body.bodyParts.forEach(bodyPart => {
        //     bodyPart.getAllSlots().forEach(slot => {
        //         slot.getInteractions().forEach(interaction => {
        //             if (interaction instanceof DuoTouchInteraction) {
        //                 if (!interaction.duoInteractionData.poseMatrix) {
        //                     return;
        //                 }
        //                 const actorPoseId = interaction.args.actorChar.pose.getCurrentPose()!.id;
        //                 const targetPoseId = interaction.args.targetChar.pose.getCurrentPose()!.id;


        //                 let shouldStopInteraction = interaction.duoInteractionData.poseMatrix?.find(poseMatrixItem => {
        //                     const targetMatches = poseMatrixItem.targetPoseIds.includes(targetPoseId);
        //                     if (!targetMatches) {
        //                         return false;
        //                     }
        //                     const actorMatches = poseMatrixItem.actorPoseIds.includes(actorPoseId);
        //                     return !actorMatches;
        //                 });

        //                 if (!shouldStopInteraction) {
        //                     shouldStopInteraction = interaction.duoInteractionData.poseMatrix?.find(poseMatrixItem => {
        //                         const targetMatches = poseMatrixItem.targetPoseIds.includes('any');
        //                         if (!targetMatches) {
        //                             return false;
        //                         }
        //                         const actorMatches = poseMatrixItem.actorPoseIds.includes(actorPoseId);
        //                         return !actorMatches;
        //                     });
        //                 }

        //                 if (shouldStopInteraction) {
        //                     if (interaction.args.actorChar === this.character) {
        //                         interaction.getActorStopAction()!.handle({});
        //                     } else {
        //                         interaction.getTargetStopAction()!.handle({});
        //                     }
        //                 }
        //             }
        //         })
        //     })
        // })
    }
}