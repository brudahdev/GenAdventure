import { Entity } from "../../../core/ec/Entity"
import { EntityRegistry } from "../../entity/EntityRegistry"
import { CharacterIdentityKey } from "./CharacterIdentity"

export function resolveTargetCharacter(
    registry: EntityRegistry,
    targetName: string,
    calledBy: Entity,
): { target: Entity; isActingOnSelf: boolean } | undefined {
    const callerName = calledBy.require(CharacterIdentityKey).name
    if (targetName === callerName || targetName === 'self') {
        return { target: calledBy, isActingOnSelf: true }
    }
    const target = registry.with(CharacterIdentityKey).find(
        e => e.require(CharacterIdentityKey).name === targetName
    )
    if (!target) return undefined
    return { target, isActingOnSelf: false }
}
