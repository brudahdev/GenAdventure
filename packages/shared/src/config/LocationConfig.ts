import { Taggable } from "../Taggable";

export interface LocationConfig extends Taggable {
    id: string,
    //todo displayName: string
    onEnterText: string,
    context: string,
    img_txt?: string,
    img_txt_neg?: string,
    background_img_txt?: string,
    background_img_txt_neg?: string,

    connectedLocations: LocationLinkConfig[]

    subLocations: SubLocationConfig[]
}

export interface LocationLinkConfig {
    locationId: string; //other location
    defaultSubLocationId: string;//sublocation of other location location
    distance: number; //in meters
}


export interface SubLocationConfig extends Taggable {
    id: string,
    //todo displayName: string
    onEnterText: string,
    img_txt?: string,
    img_txt_neg?: string,

    poses: LocationPoseConfig[],
}

export interface LocationPoseConfig {
    poseId: string,
    context: string,
    img_txt: string,
    img_txt_neg?: string,
}

