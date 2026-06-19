import { join } from "path"

/** Resolves a scenario-scoped config file path:
 *  `<scenariosConfigDirectory>/<scenarioId>/<fileName>`. Shared by the
 *  scenario-relative adapters (locations, roles, time). */
export function scenarioConfigPath(
    scenariosConfigDirectory: string,
    scenarioId: string,
    fileName: string,
): string {
    return join(scenariosConfigDirectory, scenarioId, fileName)
}
