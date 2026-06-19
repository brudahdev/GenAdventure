import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, isAbsolute, join, normalize, relative } from 'path'

/**
 * Reads/writes plain-text files under `userData/save_data/`. All on-disk app
 * data lives under this root; callers pass a path relative to it
 * (e.g. `configs/appearance.json`). Filesystem access stays in the main process.
 */

const root = (): string => join(app.getPath('userData'), 'save_data')

/** Resolve a caller-supplied relative path, rejecting anything that escapes the root. */
function resolveWithin(relPath: string): string {
  const base = root()
  const target = normalize(join(base, relPath))
  const rel = relative(base, target)
  if (isAbsolute(rel) || rel.startsWith('..')) {
    throw new Error(`Path escapes save_data root: ${relPath}`)
  }
  return target
}

/** Resolve an absolute path under the save_data root (rejects traversal). */
export function absolutePath(relPath = ''): string {
  return resolveWithin(relPath)
}

/** Returns the file's contents, or '' if it does not exist yet. */
export async function read(relPath: string): Promise<string> {
  const target = resolveWithin(relPath)
  try {
    return await readFile(target, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw err
  }
}

/** Writes contents to the file, creating parent directories as needed. */
export async function write(relPath: string, content: string): Promise<void> {
  const target = resolveWithin(relPath)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, content, 'utf-8')
}
