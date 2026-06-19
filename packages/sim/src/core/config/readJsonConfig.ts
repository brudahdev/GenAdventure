import { readFileSync } from "fs";

/** Reads and parses a JSON config file, throwing an error labeled with `what`
 *  (e.g. "role config") when the file is missing or malformed. */
export function readJsonConfig<T>(filePath: string, what: string): T {
    try {
        return JSON.parse(readFileSync(filePath, 'utf-8')) as T
    } catch (e) {
        throw new Error(`unable to read ${what} at ${filePath}: ${e instanceof Error ? e.message : e}`)
    }
}
