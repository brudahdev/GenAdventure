/** A mistreevous "agent" is just a bag of named functions that a behaviour
 *  tree's leaf nodes (actions/conditions/guards) resolve against by name —
 *  mistreevous invokes them with `this` bound to the agent. The agent is composed
 *  per submission from the registered leaf-sets (see
 *  {@link import("../../game/behavior/BehaviorLeafRegistry").BehaviorLeafRegistry}).
 *
 *  mistreevous does not export its `Agent` type, so this alias documents the
 *  contract and is what we cast to when constructing a `BehaviourTree`. */
export type BehaviorAgentFn = (...args: unknown[]) => unknown
export type BehaviorAgent = Record<string, BehaviorAgentFn | unknown>
