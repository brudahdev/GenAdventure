import { Taggable } from "../Taggable";

export interface PoseConfig extends Taggable{
    id: string;
    verb: string;
    occludedAppearanceClasses?: string[];
}