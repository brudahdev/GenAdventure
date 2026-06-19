/** Per clothing item, the inactive state IDs it could change into. Pushed from
 *  the sim up to the main process so ClothingService can surface the options. */
export interface ClothingStateChangeOptionsSummary {
    clothingItemId: string,
    stateIds: string[],
}
