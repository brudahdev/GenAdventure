export interface TouchOptions {
    targets: {
        id: string,
        with: {
            id: string,
            verb: {
                id: string,
            }[]
        }[]
    }[],
}
