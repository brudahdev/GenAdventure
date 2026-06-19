import * as fs from "fs"

/** Writes `contents` to `filePath` crash-safely: stages a sibling temp file and
 *  atomically renames it into place, so an interrupted write can never leave a
 *  half-written (corrupt) save — the previous file survives intact. */
export function atomicWriteFileSync(filePath: string, contents: string): void {
    const tmpPath = `${filePath}.tmp`
    fs.writeFileSync(tmpPath, contents, 'utf-8')
    fs.renameSync(tmpPath, filePath)
}
