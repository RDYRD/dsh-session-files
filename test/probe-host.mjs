/**
 * Host-side probe for the "vanished file" behaviour:
 *   1. trashPaths flags a missing path instead of only erroring
 *   2. /dismiss round-trips through the dismissed store
 *   3. /artifacts hides dismissed paths and recomputes the counts
 *
 * Runs against the real session store (read-only) and the real dismissed store,
 * but only ever touches a throwaway session id, which it removes afterwards.
 */
import fs from 'node:fs'
import path from 'node:path'

import { apply } from '../lib/index.js'
import { listSessions, readSession } from '../lib/session-file.js'
import { addDismissed, dismissedRoot, normalizeKey, readDismissed, trashPaths } from '../lib/trash.js'

const PROBE_SESSION = `_probe-dismiss-${process.pid}`
let failures = 0
const check = (name, ok, detail) => {
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  ' + detail : ''))
  if (!ok) failures += 1
}

// 1. trashPaths: a vanished path is a "missing" result, not a plain failure.
const vanished = path.join('C:\\', '__definitely_not_here__', 'nothing.png')
const [result] = trashPaths([vanished])
check('missing path returns ok:false', result?.ok === false, JSON.stringify(result))
check('missing path is flagged missing', result?.missing === true)

// A path that exists must not be flagged missing.
const realProbe = path.join(process.cwd(), `_probe-existing-${process.pid}.txt`)
fs.writeFileSync(realProbe, 'probe')
const [existing] = trashPaths([realProbe])
check('existing path is not flagged missing', existing?.missing !== true, JSON.stringify(existing))
if (existing?.ok && existing.id) {
  fs.rmSync(path.join(dismissedRoot(), '..', 'trash', existing.id), { recursive: true, force: true })
}

// 2. dismissed store round-trip (incl. case-insensitive keys).
addDismissed(PROBE_SESSION, [path.join('C:\\Temp\\A.png')])
const stored = readDismissed(PROBE_SESSION)
check('dismissed store persists the key', stored.has(normalizeKey('c:/temp/a.png')))
check('normalizeKey ignores case', normalizeKey('C:\\TEMP\\A.PNG') === normalizeKey('c:\\temp\\a.png'))

// 3. /artifacts filtering through the real route.
const routes = new Map()
const ctx = {
  webServer: {
    register: ({ path: routePath, handler }) => {
      routes.set(routePath, handler)
      return () => routes.delete(routePath)
    },
  },
  logger: { info() {} },
}
const dispose = await apply(ctx)
check('routes registered', routes.size >= 6, `${routes.size} routes`)

const sessions = listSessions()
const session = sessions.find((s) => (readSession(s.sessionId)?.records?.length ?? 0) > 0) ?? sessions[0]

const fakeResponse = () => {
  const out = { status: 0, body: null, headers: {}, bytes: 0 }
  out.writeHead = (code, headers) => {
    out.status = code
    out.headers = headers ?? {}
  }
  out.end = (chunk) => {
    if (typeof chunk === 'string') {
      try {
        out.body = JSON.parse(chunk)
      } catch {
        out.body = chunk
      }
    } else if (chunk && typeof chunk.length === 'number') {
      out.bytes = chunk.length
    }
  }
  return out
}
const fakeRequest = (url) => {
  const listeners = new Map()
  return {
    method: 'GET',
    url,
    headers: { 'sec-fetch-site': 'same-origin' },
    socket: { remoteAddress: '127.0.0.1' },
    on: (event, fn) => {
      listeners.set(event, fn)
    },
  }
}

const callArtifacts = async (sessionId) => {
  const response = fakeResponse()
  await routes.get('/api/dsh-session-files/artifacts')(fakeRequest(`/api/dsh-session-files/artifacts?sessionId=${encodeURIComponent(sessionId)}`), response)
  return response
}

// 4. /sessions hides forked (delegationDepth > 0) conversations by default,
//    because their artifact list is a replay of the parent's.
const callSessions = async (query) => {
  const response = fakeResponse()
  await routes.get('/api/dsh-session-files/sessions')(fakeRequest(`/api/dsh-session-files/sessions${query}`), response)
  return response
}
{
  const plain = await callSessions('')
  const withDerived = await callSessions('?includeDerived=1')
  const plainRows = plain.body?.sessions ?? []
  const allRows = withDerived.body?.sessions ?? []
  check('/sessions answers 200', plain.status === 200, `status ${plain.status}`)
  check(
    'derived sessions hidden by default',
    plainRows.every((s) => !s.derived) && allRows.length > plainRows.length,
    `${plainRows.length} shown, ${allRows.length} with ?includeDerived=1, derived=${plain.body?.derived}`,
  )
  check(
    'forked sessions keep their real title, not the pinned placeholder',
    allRows.every((s) => !String(s.title ?? '').startsWith('Side:')),
    allRows.filter((s) => s.derived).map((s) => s.title).join(' | ') || '(no derived rows)',
  )
}

// The newest session with records is not guaranteed to have produced files,
// so walk a few candidates until one actually yields artifacts.
let probeSession = null
if (session) {
  probeSession = session
  let before = await callArtifacts(probeSession.sessionId)
  let count = (before.body?.deliverables?.length ?? 0) + (before.body?.produced?.length ?? 0)
  if (count === 0) {
    for (const candidate of sessions.slice(0, 60)) {
      if (candidate.sessionId === probeSession.sessionId) continue
      const probe = await callArtifacts(candidate.sessionId)
      const probeCount = (probe.body?.deliverables?.length ?? 0) + (probe.body?.produced?.length ?? 0)
      if (probeCount > 0) {
        probeSession = candidate
        before = probe
        count = probeCount
        break
      }
    }
  }
  check('/artifacts answers 200', before.status === 200, `status ${before.status}`)
  const beforeCount = count
  const target = before.body?.produced?.[0]?.path ?? before.body?.deliverables?.[0]?.path

  if (target) {
    addDismissed(probeSession.sessionId, [target])
    const after = await callArtifacts(probeSession.sessionId)
    const afterCount = (after.body?.deliverables?.length ?? 0) + (after.body?.produced?.length ?? 0)
    check('dismissed path drops out of the list', afterCount === beforeCount - 1, `${beforeCount} -> ${afterCount}`)
    await routes.get('/api/dsh-session-files/artifacts')(fakeRequest(`/api/dsh-session-files/artifacts?sessionId=${encodeURIComponent(probeSession.sessionId)}`), fakeResponse())
  } else {
    check('session had an artifact to hide', false, 'no artifacts in any scanned session')
  }
} else {
  check('found a session to test against', false)
}

// 4. /raw must hand a PDF over as application/pdf with no attachment
// disposition, otherwise the lightbox iframe would download instead of render.
{
  const sample = path.join(process.cwd(), `_probe-sample-${process.pid}.pdf`)
  fs.writeFileSync(sample, '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n')
  const response = fakeResponse()
  await routes.get('/api/dsh-session-files/raw')(
    fakeRequest(`/api/dsh-session-files/raw?path=${encodeURIComponent(sample)}`),
    response,
  )
  check(
    'pdf streams back as application/pdf',
    response.status === 200 && response.headers['content-type'] === 'application/pdf',
    JSON.stringify(response.headers),
  )
  check('pdf is inline, not an attachment', !response.headers['content-disposition'])
  check('pdf bytes are not truncated', response.bytes === fs.statSync(sample).size, `${response.bytes} bytes`)
  fs.rmSync(sample, { force: true })
}

// Cleanup: this session's dismissed file is ours alone.
try {
  fs.rmSync(path.join(dismissedRoot(), `${String(probeSession?.sessionId ?? PROBE_SESSION).replace(/[^a-zA-Z0-9._-]/g, '_')}.json`), { force: true })
} catch {
  /* ignore */
}
try {
  const probeFile = path.join(dismissedRoot(), `${PROBE_SESSION.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`)
  fs.rmSync(probeFile, { force: true })
} catch {
  /* ignore */
}
try {
  fs.rmSync(realProbe, { force: true })
} catch {
  /* ignore */
}
dispose()

console.log(failures === 0 ? '\nhost probe clean' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
