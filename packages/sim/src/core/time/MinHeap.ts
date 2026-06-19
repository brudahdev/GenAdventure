/** Orders two values: returns a negative number when `a` should come out of the
 *  heap before `b`, positive when after, zero when interchangeable. */
export type Comparator<T> = (a: T, b: T) => number

/** Array-backed binary min-heap. `push`/`pop` are O(log n); `peek`/`size` O(1).
 *  The {@link import("./Scheduler").Scheduler} is its only consumer today — hoist
 *  to `utils/` if anything else needs a priority queue. */
export class MinHeap<T> {
    private readonly items: T[] = []

    constructor(private readonly compare: Comparator<T>) { }

    get size(): number {
        return this.items.length
    }

    /** The minimum element, or `undefined` when empty. Does not remove it. */
    peek(): T | undefined {
        return this.items[0]
    }

    push(value: T): void {
        this.items.push(value)
        this.siftUp(this.items.length - 1)
    }

    /** Removes and returns the minimum element, or `undefined` when empty. */
    pop(): T | undefined {
        const items = this.items
        const top = items[0]
        if (top === undefined) return undefined

        const last = items.pop()!
        if (items.length > 0) {
            items[0] = last
            this.siftDown(0)
        }
        return top
    }

    /** Shallow copy of the backing array, in heap order — for persistence. A
     *  fresh {@link MinHeap} re-`push`ed from this restores the same ordering. */
    toArray(): T[] {
        return [...this.items]
    }

    private siftUp(index: number): void {
        const items = this.items
        const value = items[index]
        while (index > 0) {
            const parent = (index - 1) >> 1
            if (this.compare(value, items[parent]) >= 0) break
            items[index] = items[parent]
            index = parent
        }
        items[index] = value
    }

    private siftDown(index: number): void {
        const items = this.items
        const length = items.length
        const value = items[index]
        while (true) {
            const left = index * 2 + 1
            if (left >= length) break

            const right = left + 1
            const child = right < length && this.compare(items[right], items[left]) < 0
                ? right
                : left

            if (this.compare(items[child], value) >= 0) break
            items[index] = items[child]
            index = child
        }
        items[index] = value
    }
}
