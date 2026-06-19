import type { WorkflowLeafOption } from '@gen-adventure/shared'

/**
 * Minimal JSONPath helpers for ComfyUI workflows. Paths are self-generated (only
 * ever produced by {@link enumerateLeafPaths}), so we support just the bracketed
 * subset they emit — `$['31']['inputs']['seed']` — rather than a full JSONPath
 * engine. Object keys and array indices are both rendered with bracket notation.
 */

const PREVIEW_MAX = 40

/** Render one path segment as a bracketed accessor: `['inputs']` / `[0]`. */
function segment(key: string | number): string {
  return typeof key === 'number' ? `[${key}]` : `['${key}']`
}

/** Parse a bracketed path into its ordered segments (object keys as strings). */
function parse(path: string): string[] {
  const segs: string[] = []
  const re = /\['((?:[^'\\]|\\.)*)'\]|\[(\d+)\]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(path)) !== null) {
    segs.push(match[1] !== undefined ? match[1].replace(/\\(.)/g, '$1') : match[2])
  }
  return segs
}

function isLeaf(value: unknown): boolean {
  return value === null || typeof value !== 'object'
}

function previewOf(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > PREVIEW_MAX ? `${text.slice(0, PREVIEW_MAX)}…` : text
}

/**
 * Walk the workflow and list every leaf (primitive / null) value as a
 * selectable option. Labels read `<path> (Default <value preview>)`.
 */
export function enumerateLeafPaths(root: unknown): WorkflowLeafOption[] {
  const out: WorkflowLeafOption[] = []

  const walk = (node: unknown, path: string): void => {
    if (isLeaf(node)) {
      out.push({ path, label: `${path} (Default ${previewOf(node)})` })
      return
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, path + segment(i)))
      return
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      walk(value, path + segment(key))
    }
  }

  walk(root, '$')
  return out
}

/** Resolve a path to its value, or `undefined` if any segment is missing. */
export function getByPath(root: unknown, path: string): unknown {
  let node: unknown = root
  for (const seg of parse(path)) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[seg]
  }
  return node
}

/** True if the path resolves to an existing leaf/value in the object. */
export function pathExists(root: unknown, path: string): boolean {
  if (!path || !path.startsWith('$')) return false
  let node: unknown = root
  for (const seg of parse(path)) {
    if (node === null || typeof node !== 'object') return false
    if (!(seg in (node as Record<string, unknown>))) return false
    node = (node as Record<string, unknown>)[seg]
  }
  return true
}

/** Mutate `root` in place, writing `value` at `path`. No-op for empty paths. */
export function setByPath(root: unknown, path: string, value: unknown): void {
  const segs = parse(path)
  if (segs.length === 0) return
  let node: unknown = root
  for (let i = 0; i < segs.length - 1; i++) {
    if (node === null || typeof node !== 'object') return
    node = (node as Record<string, unknown>)[segs[i]]
  }
  if (node !== null && typeof node === 'object') {
    ;(node as Record<string, unknown>)[segs[segs.length - 1]] = value
  }
}
