import { Lifecycle, scoped } from "tsyringe"
import { BehaviourTree, State } from "mistreevous"
import type { GameSystem } from "../GameSystem"
import { EventSystem } from "../../game/EventSystem"

/** Fired once when an actor's active tree settles: `true` if it SUCCEEDED, `false`
 *  if it FAILED or was replaced by a newer submission for the same actor. */
export type OnSettle = (success: boolean) => void

/** When true, every started tree logs its MDSL definition + a matching mocked
 *  `Agent` class — paste the MDSL into the visualiser's top window and the
 *  class into the lower (agent) window to inspect/replay. */
const DEBUG = true

/** Build a mock `Agent` class source for the mistreevous visualiser's lower
 *  window, with one stub method per leaf/guard named in the MDSL. Conditions and
 *  `while`/`until` guards return a boolean; actions return a `State`. The values
 *  are placeholders — edit them live in the visualiser to drive the tree down a
 *  particular path. */
function buildMockAgent(mdsl: string): string {
    const collect = (re: RegExp): string[] => {
        const names = new Set<string>()
        for (const m of mdsl.matchAll(re)) names.add(m[1])
        return [...names]
    }
    // `condition [X]`, `while(X)`, `until(X)` are all boolean-returning.
    const conditions = new Set([
        ...collect(/condition\s*\[\s*(\w+)/g),
        ...collect(/(?:while|until)\s*\(\s*(\w+)/g),
    ])
    // `action [X]` returns a State (excluding any name already a condition).
    const actions = collect(/action\s*\[\s*(\w+)/g).filter(n => !conditions.has(n))

    const condMethods = [...conditions].map(n => `    ${n}() { return true; }`)
    const actionMethods = actions.map(n => `    ${n}() { return State.SUCCEEDED; }`)

    return [
        "class Agent {",
        "    // conditions / guards — return a boolean (edit to steer the tree)",
        ...condMethods,
        "    // actions — return a State (SUCCEEDED | FAILED | RUNNING)",
        ...actionMethods,
        "}",
    ].join("\n")
}

interface ActiveTree {
    readonly tree: BehaviourTree
    readonly mdsl: string
    readonly onSettle?: OnSettle
}

/** The single place behaviour trees are advanced — the BT analogue of the old
 *  plan walk. Holds at most one active tree per actor (a new submission replaces
 *  the previous one) and steps them all on every `time.tick`, so a tree that
 *  returns `RUNNING` (e.g. one move hop per step) continues across ticks. Trees
 *  are runtime-only: nothing here is saved or restored. */
@scoped(Lifecycle.ContainerScoped)
export class BehaviorTreeRunner implements GameSystem {
    private readonly active = new Map<string, ActiveTree>()
    private unsubscribe?: () => void

    constructor(private readonly eventSystem: EventSystem) { }

    init(): void {
        this.unsubscribe = this.eventSystem.on("time.tick", () => this.stepAll())
    }

    dispose(): void {
        this.unsubscribe?.()
        this.unsubscribe = undefined
        this.active.clear()
    }

    /** Begin (or replace) the active tree for an actor. Any tree already running
     *  for that actor is abandoned, settling its `onSettle` with `false`. Steps
     *  once immediately so an all-instant tree (e.g. a co-located pose change)
     *  settles within this call. */
    start(actorId: string, tree: BehaviourTree, onSettle?: OnSettle, mdsl = ""): void {
        const previous = this.active.get(actorId)
        const entry: ActiveTree = { tree, mdsl, onSettle }
        this.active.set(actorId, entry)
        previous?.onSettle?.(false)
        if (DEBUG) this.logDebug(actorId, entry)
        this.step(actorId, entry)
    }

    /** True when the actor has no active tree (idle / settled). */
    isIdle(actorId: string): boolean {
        return !this.active.has(actorId)
    }

    /** True when no actor has an active tree. */
    allIdle(): boolean {
        return this.active.size === 0
    }

    /** Returns the MDSL definition and current node-state snapshot for an actor's
     *  active tree, or `null` when the actor is idle. Intended for debug use only
     *  (e.g. paste `nodeDetails` JSON into the mistreevous visualiser). */
    getDebugSnapshot(actorId: string): { mdsl: string; nodeDetails: unknown } | null {
        const entry = this.active.get(actorId)
        if (!entry) return null
        return { mdsl: entry.mdsl, nodeDetails: entry.tree.getTreeNodeDetails() }
    }

    /** Dump an actor's tree definition + a matching mock agent for the visualiser. */
    private logDebug(actorId: string, entry: ActiveTree): void {
        console.log(`[bt] tree started for ${actorId}\n--- MDSL (top window) ---\n${entry.mdsl}`)
        console.log(`--- Agent (lower window) ---\n${buildMockAgent(entry.mdsl)}`)
    }

    /** Advance every active tree one step; drop and settle any that finished. */
    stepAll(): void {
        for (const [actorId, entry] of [...this.active]) {
            // Skip any replaced/removed by a settle callback earlier this pass.
            if (this.active.get(actorId) !== entry) continue
            this.step(actorId, entry)
        }
    }

    private step(actorId: string, entry: ActiveTree): void {
        entry.tree.step()
        const state = entry.tree.getState()
        if (state !== State.SUCCEEDED && state !== State.FAILED) return

        // Only clear if this exact entry is still the active one (a settle
        // callback may have started a replacement).
        if (this.active.get(actorId) === entry) this.active.delete(actorId)
        entry.onSettle?.(state === State.SUCCEEDED)
    }
}
