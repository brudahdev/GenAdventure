import { defineKey } from "../../../core/ec/ComponentKey";
import { defineFactory } from "../../../core/ec/ComponentFactory";

/** Marker component: the entity is the player. Replaces the `Player` subclass —
 *  "the player is the entity with a PlayerControlled component". */
export const PlayerKey = defineKey<PlayerControlled>("character.player")
export class PlayerControlled { }

/** Tags an entity as player-controlled. */
export const playerMarkerFactory = defineFactory(PlayerKey, () => new PlayerControlled())

