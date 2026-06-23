/** The input vocabulary of the action layer. An {@link Intent} is a high-level
 *  goal — plain, JSON-serializable data with no behaviour — that the
 *  {@link import("../../game/behavior/BehaviorDispatcher").BehaviorDispatcher} maps
 *  to a mistreevous behaviour tree (`game/behavior/behaviorTrees.ts`). Concrete
 *  intents extend this with their own fields (see `game/plan/planDefs` and the
 *  per-aspect `behavior/` `*Intent` files). */
export interface Intent {
    readonly kind: 'intent'
    readonly type: string
}
