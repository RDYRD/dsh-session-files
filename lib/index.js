import fs from 'node:fs'
import path from 'node:path'

import { extractArtifacts } from './artifacts.js'
import { listSessions, readSession } from './session-file.js'
import { addDismissed, listTrash, normalizeKey, purgeEntry, readDismissed, restoreEntry, trashPaths } from './trash.js'

export const inject = ['webServer']

const PREFIX = '/api/dsh-session-artifacts'
const MAX_BODY_BYTES = 256 * 1024
/** Inline preview ceiling: a 48 MB image is already unreasonable to decode. */
const MAX_RAW_BYTES = 48 * 1024 * 1024
/** Text previews stop early — nobody reads a 40 MB log through a sidebar. */
const MAX_TEXT_BYTES = 256 * 1024

const MIME_BY_EXT = new Map(
  Object.entries({
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.pdf': 'application/pdf',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.json': 'text/plain; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.csv': 'text/plain; charset=utf-8',
    '.py': 'text/plain; charset=utf-8',
    '.gd': 'text/plain; charset=utf-8',
    '.js': 'text/plain; charset=utf-8',
    '.mjs': 'text/plain; charset=utf-8',
    '.ts': 'text/plain; charset=utf-8',
    '.yml': 'text/plain; charset=utf-8',
    '.yaml': 'text/plain; charset=utf-8',
    '.toml': 'text/plain; charset=utf-8',
    '.sh': 'text/plain; charset=utf-8',
    '.ps1': 'text/plain; charset=utf-8',
  }),
)

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(value))
}

function readJsonBody(request) {
  return new Promise((resolve) => {
    const chunks = []
    let bytes = 0
    let aborted = false
    request.on('data', (chunk) => {
      if (aborted) return
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      bytes += buffer.length
      if (bytes > MAX_BODY_BYTES) {
        aborted = true
        resolve(null)
        return
      }
      chunks.push(buffer)
    })
    request.on('end', () => {
      if (aborted) return
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null')
        resolve(parsed !== null && typeof parsed === 'object' ? parsed : null)
      } catch {
        resolve(null)
      }
    })
    request.on('error', () => resolve(null))
  })
}

function isLoopback(address) {
  if (typeof address !== 'string') return false
  return (
    address === '::1' ||
    address === '127.0.0.1' ||
    address.startsWith('127.') ||
    address.startsWith('::ffff:127.')
  )
}

/**
 * The sidebar talks to this plugin over the same loopback origin DSH serves the
 * GUI from. A trashed file is destructive (and a restore can overwrite nothing
 * but is still a write), so every route demands: a loopback peer, no
 * cross-site fetch, and — for mutations — a JSON content type, which a
 * cross-origin HTML form cannot produce. `sec-fetch-site` is absent on some
 * non-browser clients, so a missing value is accepted only behind the loopback
 * check.
 */
function isTrustedRequest(request, { requireJson = false } = {}) {
  if (!isLoopback(request.socket?.remoteAddress)) return false
  const site = request.headers['sec-fetch-site']
  if (site !== undefined && site !== 'same-origin' && site !== 'none') return false
  if (requireJson) {
    const type = String(request.headers['content-type'] ?? '')
    if (!type.toLowerCase().includes('application/json')) return false
  }
  return true
}

const artifactCache = new Map()
const ARTIFACT_CACHE_LIMIT = 12

function cachedArtifacts(session) {
  let stat
  try {
    stat = fs.statSync(session.file)
  } catch {
    return null
  }
  const key = `${session.file}:${stat.size}:${stat.mtimeMs}`
  const hit = artifactCache.get(key)
  if (hit) return hit
  const result = extractArtifacts(session.records, { cwd: session.cwd })
  const payload = {
    sessionId: session.sessionId,
    title: session.title,
    cwd: session.cwd,
    createdAt: session.createdAt,
    ...result,
  }
  artifactCache.set(key, payload)
  if (artifactCache.size > ARTIFACT_CACHE_LIMIT) {
    artifactCache.delete(artifactCache.keys().next().value)
  }
  return payload
}

function route(ctx, endpoint, handler) {
  return ctx.webServer.register({
    kind: 'exact',
    path: endpoint,
    handler: async (request, response) => {
      try {
        await handler(request, response)
      } catch (error) {
        if (!response.headersSent) {
          sendJson(response, 500, { ok: false, error: String(error?.message ?? error) })
        } else {
          response.end()
        }
      }
    },
  })
}

function methodNotAllowed(response, allow) {
  response.writeHead(405, { allow })
  response.end()
}

export async function apply(ctx) {
  const disposers = []

  // Conversation picker data: one row per session on disk.
  disposers.push(
    route(ctx, `${PREFIX}/sessions`, async (request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        methodNotAllowed(response, 'GET, HEAD')
        return
      }
      if (!isTrustedRequest(request)) {
        sendJson(response, 403, { ok: false, error: 'untrusted request' })
        return
      }
      // Forked/side sessions (delegationDepth > 0) replay their parent's history,
      // so their artifact list is a duplicate by construction — hidden by default,
      // surfaced with ?includeDerived=1 when someone really wants them.
      const url = new URL(request.url, 'http://127.0.0.1')
      const includeDerived = url.searchParams.get('includeDerived') === '1'
      const all = listSessions()
      const sessions = all
        .filter((s) => includeDerived || !s.derived)
        .map((s) => ({
          sessionId: s.sessionId,
          title: s.title,
          cwd: s.cwd,
          createdAt: s.createdAt,
          turnCount: s.turnCount,
          size: s.size,
          mtime: s.mtime,
          workspace: s.workspace,
          derived: Boolean(s.derived),
          origin: s.origin,
          parentSession: s.parentSession,
        }))
      sendJson(response, 200, {
        ok: true,
        sessions,
        derived: all.filter((s) => s.derived).length,
        total: all.length,
      })
    }),
  )

  // The two artifact groups for one conversation.
  disposers.push(
    route(ctx, `${PREFIX}/artifacts`, async (request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        methodNotAllowed(response, 'GET, HEAD')
        return
      }
      if (!isTrustedRequest(request)) {
        sendJson(response, 403, { ok: false, error: 'untrusted request' })
        return
      }
      const url = new URL(request.url ?? '/', 'http://localhost')
      const sessionId = url.searchParams.get('sessionId')
      if (!sessionId) {
        sendJson(response, 400, { ok: false, error: 'sessionId is required' })
        return
      }
      const session = readSession(sessionId)
      if (!session) {
        sendJson(response, 404, { ok: false, error: `session not found: ${sessionId}` })
        return
      }
      const payload = cachedArtifacts(session)
      const dismissed = readDismissed(sessionId)
      if (dismissed.size > 0) {
        // Files that already vanished from disk and were explicitly removed from
        // the list: they cannot be restored, so the only honest answer is to stop
        // listing them — and to recompute the counts without them.
        const keep = (item) => !dismissed.has(normalizeKey(item.path))
        const deliverables = payload.deliverables.filter(keep)
        const produced = payload.produced.filter(keep)
        sendJson(response, 200, {
          ok: true,
          ...payload,
          deliverables,
          produced,
          counts: {
            deliverables: deliverables.length,
            produced: produced.length,
            missing:
              deliverables.filter((item) => !item.exists).length +
              produced.filter((item) => !item.exists).length,
            bytes:
              deliverables.reduce((sum, item) => sum + (item.exists ? item.size : 0), 0) +
              produced.reduce((sum, item) => sum + (item.exists ? item.size : 0), 0),
          },
        })
        return
      }
      sendJson(response, 200, { ok: true, ...payload })
    }),
  )

  // Raw bytes for the inline preview (image / video / text). A thumbnail or a
  // text peek is just this route with a different query, so the sidebar never
  // has to open the file in the editor to answer "what is this?".
  disposers.push(
    route(ctx, `${PREFIX}/raw`, async (request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        methodNotAllowed(response, 'GET, HEAD')
        return
      }
      if (!isTrustedRequest(request)) {
        sendJson(response, 403, { ok: false, error: 'untrusted request' })
        return
      }
      const url = new URL(request.url ?? '/', 'http://localhost')
      const target = url.searchParams.get('path')
      if (!target) {
        sendJson(response, 400, { ok: false, error: 'path is required' })
        return
      }
      let stat
      try {
        stat = fs.statSync(target)
      } catch {
        sendJson(response, 404, { ok: false, error: 'file not found' })
        return
      }
      if (!stat.isFile()) {
        sendJson(response, 400, { ok: false, error: 'not a regular file' })
        return
      }
      if (stat.size > MAX_RAW_BYTES) {
        sendJson(response, 413, { ok: false, error: `file too large to preview (${stat.size} bytes)` })
        return
      }
      const asText = url.searchParams.get('mode') === 'text'
      const extension = path.extname(target).toLowerCase()
      let body
      try {
        body = fs.readFileSync(target)
      } catch (error) {
        sendJson(response, 500, { ok: false, error: String(error?.message ?? error) })
        return
      }
      let contentType = MIME_BY_EXT.get(extension) ?? 'application/octet-stream'
      if (asText) {
        body = body.subarray(0, MAX_TEXT_BYTES)
        contentType = 'text/plain; charset=utf-8'
      }
      response.writeHead(200, {
        'content-type': contentType,
        'content-length': body.length,
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      })
      response.end(request.method === 'HEAD' ? undefined : body)
    }),
  )

  // Move files into the reversible trash.
  disposers.push(
    route(ctx, `${PREFIX}/trash`, async (request, response) => {
      if (request.method === 'GET' || request.method === 'HEAD') {
        if (!isTrustedRequest(request)) {
          sendJson(response, 403, { ok: false, error: 'untrusted request' })
          return
        }
        sendJson(response, 200, { ok: true, entries: listTrash() })
        return
      }
      if (request.method !== 'POST') {
        methodNotAllowed(response, 'GET, HEAD, POST')
        return
      }
      if (!isTrustedRequest(request, { requireJson: true })) {
        sendJson(response, 403, { ok: false, error: 'untrusted request' })
        return
      }
      const body = await readJsonBody(request)
      const paths = Array.isArray(body?.paths) ? body.paths.filter((p) => typeof p === 'string') : []
      if (paths.length === 0) {
        sendJson(response, 400, { ok: false, error: 'paths must be a non-empty string array' })
        return
      }
      const results = trashPaths(paths, { sessionId: body?.sessionId ?? null, cwd: body?.cwd ?? null })
      artifactCache.clear()
      sendJson(response, 200, { ok: true, results })
    }),
  )

  // Remember that a vanished path should stop being listed. Nothing is deleted
  // here — there is nothing left to delete — the path just drops out of
  // /artifacts for this conversation from now on.
  disposers.push(
    route(ctx, `${PREFIX}/dismiss`, async (request, response) => {
      if (request.method !== 'POST') {
        methodNotAllowed(response, 'POST')
        return
      }
      if (!isTrustedRequest(request, { requireJson: true })) {
        sendJson(response, 403, { ok: false, error: 'untrusted request' })
        return
      }
      const body = await readJsonBody(request)
      const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
      if (!sessionId) {
        sendJson(response, 400, { ok: false, error: 'sessionId is required' })
        return
      }
      const paths = Array.isArray(body?.paths) ? body.paths.filter((p) => typeof p === 'string' && p) : []
      if (paths.length === 0) {
        sendJson(response, 400, { ok: false, error: 'paths must be a non-empty string array' })
        return
      }
      const total = addDismissed(sessionId, paths)
      sendJson(response, 200, { ok: true, paths, dismissed: total })
    }),
  )

  // Restore one trashed entry to its original absolute path.
  disposers.push(
    route(ctx, `${PREFIX}/restore`, async (request, response) => {
      if (request.method !== 'POST') {
        methodNotAllowed(response, 'POST')
        return
      }
      if (!isTrustedRequest(request, { requireJson: true })) {
        sendJson(response, 403, { ok: false, error: 'untrusted request' })
        return
      }
      const body = await readJsonBody(request)
      if (typeof body?.id !== 'string' || !body.id) {
        sendJson(response, 400, { ok: false, error: 'id is required' })
        return
      }
      const result = restoreEntry(body.id)
      artifactCache.clear()
      sendJson(response, result.ok ? 200 : 409, result)
    }),
  )

  // Irreversible: drop one trash entry for good.
  disposers.push(
    route(ctx, `${PREFIX}/purge`, async (request, response) => {
      if (request.method !== 'POST') {
        methodNotAllowed(response, 'POST')
        return
      }
      if (!isTrustedRequest(request, { requireJson: true })) {
        sendJson(response, 403, { ok: false, error: 'untrusted request' })
        return
      }
      const body = await readJsonBody(request)
      if (typeof body?.id !== 'string' || !body.id) {
        sendJson(response, 400, { ok: false, error: 'id is required' })
        return
      }
      const result = purgeEntry(body.id)
      sendJson(response, result.ok ? 200 : 500, result)
    }),
  )

  ctx.logger?.info?.('session-artifacts: routes registered under ' + PREFIX)

  return () => {
    for (const dispose of disposers) {
      try {
        dispose()
      } catch {
        /* already released */
      }
    }
  }
}
