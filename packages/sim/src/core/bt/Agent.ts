/** A mistreevous "agent" is just a bag of named functions that a behaviour
 *  tree's leaf nodes (actions/conditions/guards) resolve against by name —
 *  mistreevous invokes them with `this` bound to the agent. We model each agent
 *  as a small class whose methods are those leaves (see
 *  {@link import("../../game/behavior/CharacterBehaviorAgent").CharacterBehaviorAgent}).
 *
 *  mistreevous does not export its `Agent` type, so this alias documents the
 *  contract and is what we cast to when constructing a `BehaviourTree`. */
export type BehaviorAgentFn = (...args: unknown[]) => unknown
export type BehaviorAgent = Record<string, BehaviorAgentFn | unknown>
