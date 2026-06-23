import type { TouchOptions } from "@gen-adventure/shared";
import type { Entity } from "../../../../core/ec/Entity";
import { BodyKey } from "../Body";
import type { TouchConfig } from "./config/TouchConfigs";

/** Builds the {@link TouchOptions} graph for an `actor` touching a `target` from a
 *  set of interaction configs. Keeps only interactions where the actor has the
 *  `actorPart` and the target has the `targetPart`, then nests them
 *  `targetPart → actorPart → verb` (the menu's "Target part → With → Verb"
 *  cascade). All ids are part names / verb words so a UI selection feeds straight
 *  back into the tag machinery. Solo vs duo is just which list is passed in (and,
 *  for solo, actor === target). */
export function buildTouchOptions(
    actor: Entity,
    target: Entity,
    interactions: TouchConfig[],
): TouchOptions {
    const actorBody = actor.get(BodyKey)
    const targetBody = target.get(BodyKey)
    if (!actorBody || !targetBody) return { targets: [] }

    // targetPart -> actorPart -> ordered set of verb ids.
    const byTarget = new Map<string, Map<string, Set<string>>>()

    for (const interaction of interactions) {
        if (!actorBody.getPart(interaction.actorPart)) continue
        if (!targetBody.getPart(interaction.targetPart)) continue

        const withMap = byTarget.get(interaction.targetPart) ?? new Map<string, Set<string>>()
        byTarget.set(interaction.targetPart, withMap)

        const verbs = withMap.get(interaction.actorPart) ?? new Set<string>()
        withMap.set(interaction.actorPart, verbs)

        verbs.add(interaction.verb)
    }

    return {
        targets: [...byTarget].map(([targetPart, withMap]) => ({
            id: targetPart,
            with: [...withMap].map(([actorPart, verbs]) => ({
                id: actorPart,
                verb: [...verbs].map(verb => ({ id: verb })),
            })),
        })),
    }
}
