/** DI token for the run's own child container, registered into itself so
 *  systems (e.g. `EntityRegistry`) can resolve component factories by class.
 *
 *  Lives in its own module so `EntityRegistry` and `SimProvisioner` can both
 *  import it without forming an import cycle — a cycle would leave the token
 *  `undefined` at decoration time and break `@inject(RUN_CONTAINER)`. */
export const RUN_CONTAINER = 'RunContainer'
