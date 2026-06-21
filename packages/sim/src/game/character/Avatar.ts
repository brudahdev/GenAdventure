import { defineFactory } from "../../core/ec/ComponentFactory";
import { defineKey } from "../../core/ec/ComponentKey";
import { Entity } from "../../core/ec/Entity";
import { EventSystem } from "../EventSystem";
import { buildAvatarPrompt } from "./characterViews";

export const AvatarKey = defineKey<Avatar>("character.avatar")
export const avatarFactory = defineFactory(AvatarKey, (entity, c) =>
    new Avatar(entity, c.resolve(EventSystem))
)

export class Avatar {
    private isAvatarDirtied = false;
    constructor(
        readonly entity: Entity,
        readonly eventSystem: EventSystem,
    ) {

    }

    dirtied() {
        this.isAvatarDirtied = true;
    }

    updateAvatar() {
        if (!this.isAvatarDirtied) {
            return;
        }
        this.isAvatarDirtied = false;

        this.eventSystem.emit("image.request", buildAvatarPrompt(this.entity))
    }

}