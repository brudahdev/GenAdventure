import type { TouchConfig, TouchDuoConfig, TouchNonVisualConfig } from "./TouchConfigs";
import { duoInteractions, nonVisualInteractions, soloInteractions } from "./TouchInteractions";

/** Touch interaction rule sets. This is the single seam the {@link TouchManager}
 *  reads its rules from; the concrete data lives in {@link TouchInteractions}. */

/** Solo (self-directed) touch interactions: actor and target are the same character. */
export function getSoloInteractions(): TouchConfig[] {
    return soloInteractions;
}

/** Duo touch interactions: actor touches a different target character. */
export function getDuoInteractions(): TouchDuoConfig[] {
    return duoInteractions;
}

/** Non-visual interactions: matched by tag but produce no avatar/visual effect. */
export function getNonVisualInteractions(): TouchNonVisualConfig[] {
    return nonVisualInteractions;
}
