import { Lifecycle, scoped } from "tsyringe"
import { BehaviourTree, State } from "mistreevous"
import type { GameSystem } from "../GameSystem"
import { EventSystem } from "../../game/EventSystem"

/** Fired once when an actor's active tree settles: `true` if it SUCCEEDED, `false`
 *  if it FAILED or was replaced by a newer submission for the same actor. */
export type OnSettle = (success: boolean) => void

interface ActiveTree {
    readonly tree: BehaviourTree
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
    start(actorId: string, tree: BehaviourTree, onSettle?: OnSettle): void {
        const previous = this.active.get(actorId)
        const entry: ActiveTree = { tree, onSettle }
        this.active.set(actorId, entry)
        previous?.onSettle?.(false)
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
