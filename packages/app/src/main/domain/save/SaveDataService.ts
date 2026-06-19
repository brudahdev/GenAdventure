import { singleton } from "tsyringe";
import { app } from 'electron'
import { access, cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { dirname, isAbsolute, join, normalize, relative } from 'path'

const root = (): string => join(app.getPath('userData'), 'save_data')

@singleton()
export class SaveDataService {

    /** Resolve a caller-supplied relative path, rejecting anything that escapes the root. */
    resolveWithin(relPath: string): string {
        const base = root()
        const target = normalize(join(base, relPath))
        const rel = relative(base, target)
        if (isAbsolute(rel) || rel.startsWith('..')) {
            throw new Error(`Path escapes save_data root: ${relPath}`)
        }
        return target
    }

    /** Returns the file's contents, or '' if it does not exist yet. */
    async read(relPath: string): Promise<string> {
        const target = this.resolveWithin(relPath)
        try {
            return await readFile(target, 'utf-8')
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') return ''
            throw err
        }
    }

    /** Writes contents to the file, creating parent directories as needed. */
    async write(relPath: string, content: string): Promise<void> {
        const target = this.resolveWithin(relPath)
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, content, 'utf-8')
    }

    /** Writes raw bytes to the file, creating parent directories as needed. */
    async writeBytes(relPath: string, data: Buffer): Promise<void> {
        const target = this.resolveWithin(relPath)
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, data)
    }

    /** Returns the file's raw bytes, or null if it does not exist. */
    async readBytes(relPath: string): Promise<Buffer | null> {
        const target = this.resolveWithin(relPath)
        try {
            return await readFile(target)
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
            throw err
        }
    }

    /** Recursively deletes a directory under the save_data root. No-ops if absent. */
    async deleteDir(relPath: string): Promise<void> {
        const target = this.resolveWithin(relPath)
        await rm(target, { recursive: true, force: true })
    }

    /**
     * Recursively copies a directory (files and subdirs) to another location under the
     * save_data root, overwriting the destination: the destination is removed first so
     * stale files unique to it do not linger.
     */
    async copyDir(srcRel: string, destRel: string): Promise<void> {
        const src = this.resolveWithin(srcRel)
        const dest = this.resolveWithin(destRel)
        await rm(dest, { recursive: true, force: true })
        await cp(src, dest, { recursive: true })
    }

    /** Whether a file exists under the save_data root. */
    async exists(relPath: string): Promise<boolean> {
        try {
            await access(this.resolveWithin(relPath))
            return true
        } catch {
            return false
        }
    }

    /** Names of immediate subdirectories under `relPath`. Empty array if absent. */
    async listDirs(relPath: string): Promise<string[]> {
        const target = this.resolveWithin(relPath)
        try {
            const entries = await readdir(target, { withFileTypes: true })
            return entries.filter((e) => e.isDirectory()).map((e) => e.name)
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
            throw err
        }
    }

    /** Names of immediate files under `relPath`. Empty array if absent. */
    async listFiles(relPath: string): Promise<string[]> {
        const target = this.resolveWithin(relPath)
        try {
            const entries = await readdir(target, { withFileTypes: true })
            return entries.filter((e) => e.isFile()).map((e) => e.name)
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
            throw err
        }
    }

    /** Deletes a single file under the save_data root. No-ops if absent. */
    async delete(relPath: string): Promise<void> {
        await rm(this.resolveWithin(relPath), { force: true })
    }

    /** File mtime in ms, or null if the file does not exist. */
    async mtimeMs(relPath: string): Promise<number | null> {
        try {
            return (await stat(this.resolveWithin(relPath))).mtimeMs
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
            throw err
        }
    }
}