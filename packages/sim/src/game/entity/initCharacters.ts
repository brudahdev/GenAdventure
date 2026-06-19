/** DI token for the run's initial characters (`SimStartCharacterData[]` from
 *  `SimStartData.characters`), handed in at worker boot.
 *
 *  Lives in its own module so `CharacterSpawner` and the identity factories can
 *  both import it without forming an import cycle — a cycle would leave the
 *  token `undefined` at decoration time and break `@inject(INIT_CHARACTERS)`. */
export const INIT_CHARACTERS = 'InitCharacters'
