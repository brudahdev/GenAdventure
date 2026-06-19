import { readFile } from 'fs/promises'
import { isAbsolute, join, normalize, relative } from 'path'
import { app, protocol } from 'electron'

/**
 * Custom `genimg://` scheme that serves generated images from the on-disk image
 * cache to the renderer. Loading `file://` from the dev-server origin is blocked
 * by webSecurity/CSP, so generated images are exposed through this privileged
 * scheme instead. URLs look like `genimg://img/<encodeURIComponent(absolutePath)>`;
 * only paths inside the saved image root are served (path-traversal guard).
 */

const SCHEME = 'genimg'

/** Root of the persisted image cache (`save_data/img_gen/`). */
export const savedImageRoot = (): string =>
  join(app.getPath('userData'), 'save_data', 'img_gen')

/** Build a renderer-loadable URL for a generated image's absolute path. */
export function toImageUrl(absPath: string): string {
  return `${SCHEME}://img/${encodeURIComponent(absPath)}`
}

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif'
}

/** Must be called before `app.ready` so the scheme is treated as privileged. */
export function registerImageScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true }
    }
  ])
}

/** Must be called after the app is ready to start serving image requests. */
export function registerImageProtocol(): void {
  protocol.handle(SCHEME, async (request) => {
    try {
      const encoded = new URL(request.url).pathname.replace(/^\/+/, '')
      const target = normalize(decodeURIComponent(encoded))

      const base = savedImageRoot()
      const rel = relative(base, target)
      const inside = rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
      if (!inside) return new Response('Forbidden', { status: 403 })

      const bytes = await readFile(target)
      const ext = target.split('.').pop()?.toLowerCase() ?? ''
      return new Response(bytes, {
        headers: { 'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream' }
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
