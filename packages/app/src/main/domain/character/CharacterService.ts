import { container, singleton } from "tsyringe";
import type { CharacterDetail, ScenarioCharacter, VoxtaScenarioSummary } from "@gen-adventure/shared";
import { VoxtaClient } from "../../integration/voxta/voxtaClient";


const voxtaClient = container.resolve(VoxtaClient);

@singleton()
export class CharacterService {
    /** id → character detail, so names are resolvable without a REST round-trip. */
    private readonly cache = new Map<string, CharacterDetail>();

    private scenarioRoster: ScenarioCharacter[] = [];

    constructor() { }

    async listCharacters() {
        return voxtaClient.listCharacters()
    }

    /** Fetch a character's detail, caching it (and its name) by id. */
    async getCharacter(id: string): Promise<CharacterDetail> {
        const cached = this.cache.get(id);
        if (cached) return cached;
        const detail = await voxtaClient.getCharacter(id);
        this.cache.set(id, detail);
        return detail;
    }

    /** The cached display name for a character id, or undefined if not loaded yet. */
    getCachedName(id: string): string | undefined {
        return this.cache.get(id)?.name;
    }

    /** Build and store the roster for the active scenario. Returns it for the caller (e.g. SimManager). */
    async loadScenarioRoster(scenario: VoxtaScenarioSummary): Promise<ScenarioCharacter[]> {
        this.scenarioRoster = await Promise.all(
            scenario.roles.map(async (role) => {
                const character = await this.getCharacter(role.defaultCharacterId);
                return {
                    name: character.name,
                    roleName: role.roleName,
                    roleOrder: role.roleOrder,
                    characterId: role.defaultCharacterId,
                    isActive: true
                };
            })
        );
        return this.scenarioRoster;
    }

    getScenarioCharacters(): ScenarioCharacter[] {
        return this.scenarioRoster;
    }

    getScenarioCharacterById(characterId: string) {
        return this.scenarioRoster.find(character => character.characterId === characterId)
    }

    clearScenarioRoster(): void {
        this.scenarioRoster = [];
    }
}