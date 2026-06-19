export interface TouchOptions {
    targets: {
        id: string,
        displayName: string,
        with: {
            id: string,
            displayName: string,
            verb: {
                id: string,
                displayName: string,
            }[]
        }[]
    }[]
}
