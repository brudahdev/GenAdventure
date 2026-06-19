/** A list of `{ id }` items indexed by id, with throwing and non-throwing
 *  accessors. Removes the repeated map-build + get-or-throw boilerplate shared by
 *  the id-keyed config adapters (clothing item, outfit, appearance, pose). */
export interface IndexedById<T> {
    all(): T[]
    get(id: string): T | undefined
    require(id: string): T
}

export function indexById<T extends { id: string }>(items: T[], label: string): IndexedById<T> {
    const byId = new Map(items.map(item => [item.id, item]))
    return {
        all: () => items,
        get: (id) => byId.get(id),
        require: (id) => {
            const item = byId.get(id)
            if (!item) {
                throw new Error(`unable to find ${label} with id ${id}`)
            }
            return item
        },
    }
}
