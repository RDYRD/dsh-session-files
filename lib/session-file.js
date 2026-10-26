import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'

const ZSTD_MAGIC_0 = 0x28
const ZSTD_MAGIC_1 = 0xb5
const ZSTD_MAGIC_2 = 0x2f
const ZSTD_MAGIC_3 = 0xfd
const SESSION_FILE = 'session.v4.jsonl.zstd'

/** Root of the harness home, honouring DSH_HOME when the host sets it. */
export function dshHome() {
  return process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
}

export function sessionsRoot() {
  return path.join(dshHome(), 'sessions')
}

/**
 * DSH persists one conversation as a CONCATENATION of independent zstd frames
 * (one frame per flushed chunk). Node's `zstdDecompressSync` decodes only the
 * first frame, and the streaming API stops at the frame boundary too, so the
 * buffer is split on the zstd magic and every frame decoded on its own.
 * Frames that fail to decode (a torn tail after an interrupted write) are
 * skipped rather than aborting the whole read.
 */
export function decompressSessionBuffer(buffer) {
  const starts = []
  for (let i = 0; i + 3 < buffer.length; i++) {
    if (
      buffer[i] === ZSTD_MAGIC_0 &&
      buffer[i + 1] === ZSTD_MAGIC_1 &&
      buffer[i + 2] === ZSTD_MAGIC_2 &&
      buffer[i + 3] === ZSTD_MAGIC_3
    ) {
      starts.push(i)
    }
  }
  if (starts.length === 0) {
    try {
      return zlib.zstdDecompressSync(buffer)
    } catch {
      return Buffer.alloc(0)
    }
  }
  const parts = []
  for (let k = 0; k < starts.length; k++) {
    const end = k + 1 < starts.length ? starts[k + 1] : buffer.length
    try {
      const part = zlib.zstdDecompressSync(buffer.subarray(starts[k], end))
      if (part.length > 0) parts.push(part)
    } catch {
      /* torn or non-frame boundary: skip */
    }
  }
  return Buffer.concat(parts)
}

/** Decode a session file into parsed records, dropping unparsable lines. */
export function readSessionRecords(file) {
  let raw
  try {
    raw = fs.readFileSync(file)
  } catch {
    return null
  }
  const text = decompressSessionBuffer(raw).toString('utf8')
  const records = []
  for (const line of text.split('\n')) {
    if (!line) continue
    try {
      records.push(JSON.parse(line))
    } catch {
      /* partial line from a torn frame */
    }
  }
  return records
}

/** Normalise a directory name such as `session-<uuid>` to the raw id. */
function normalizeSessionId(dirName) {
  return dirName.startsWith('session-') ? dirName.slice('session-'.length) : dirName
}

/**
 * Enumerate every conversation on disk. Title and cwd live INSIDE the session
 * file (the `session` and `session/title` header records), so each candidate is
 * opened once; the summary caches by mtime to keep repeat listing cheap.
 */
export function listSessions() {
  const root = sessionsRoot()
  const out = []
  let workspaces
  try {
    workspaces = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return out
  }
  for (const ws of workspaces) {
    if (!ws.isDirectory()) continue
    const wsDir = path.join(root, ws.name)
    let sessions
    try {
      sessions = fs.readdirSync(wsDir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const s of sessions) {
      if (!s.isDirectory()) continue
      const file = path.join(wsDir, s.name, SESSION_FILE)
      let stat
      try {
        stat = fs.statSync(file)
      } catch {
        continue
      }
      const summary = summarize(file, stat)
      if (!summary) continue
      // Copy rather than mutate: `summary` is the shared cache entry.
      out.push({
        ...summary,
        sessionId: normalizeSessionId(s.name),
        dirId: s.name,
        workspace: ws.name,
        file,
        size: stat.size,
        mtime: stat.mtimeMs,
      })
    }
  }
  out.sort((a, b) => (b.createdAt ?? b.mtime) - (a.createdAt ?? a.mtime))
  return out
}

const summaryCache = new Map()

/**
 * Pick the most useful title. A forked/side session carries the parent's title
 * rows plus its own pinned placeholder ("Side: New thread", written last with an
 * empty `messageSeqs`), so "last row wins" would show the placeholder for a
 * conversation that already has a real, LLM-generated name.
 * Precedence: a real user rename > the provider-generated title > anything.
 */
function pickTitle(records) {
  const rows = records.filter((r) => r.type === 'session/title' && r.data?.title)
  if (rows.length === 0) return null
  const renamed = rows
    .filter((r) => r.data.source?.kind === 'user' && (r.data.messageSeqs?.length ?? 0) > 0)
    .pop()
  if (renamed) return renamed.data.title
  const generated = rows.filter((r) => r.data.source?.kind === 'provider').pop()
  if (generated) return generated.data.title
  return rows[rows.length - 1].data.title
}

function summarize(file, stat) {
  const key = `${file}:${stat.size}:${stat.mtimeMs}`
  const hit = summaryCache.get(key)
  if (hit) return hit
  const records = readSessionRecords(file)
  if (!records) return null
  let createdAt = null
  let cwd = null
  let turnCount = 0
  let delegationDepth = 0
  let origin = null
  let parentSession = null
  for (const rec of records) {
    if (rec.type === 'session') {
      createdAt = rec.createdAt ?? null
      cwd = rec.cwd ?? null
      delegationDepth = rec.delegationDepth ?? 0
      origin = rec.origin ?? null
      parentSession = rec.parentSession ?? null
    } else if (rec.type === 'turn/start') {
      turnCount++
    }
  }
  const summary = {
    createdAt,
    cwd,
    title: pickTitle(records),
    turnCount,
    delegationDepth,
    origin,
    parentSession: typeof parentSession === 'string' ? parentSession.replace(/^session-/, '') : null,
    derived: delegationDepth > 0,
  }
  summaryCache.set(key, summary)
  // Bound the cache: session files are re-keyed on every append anyway.
  if (summaryCache.size > 256) {
    const first = summaryCache.keys().next().value
    summaryCache.delete(first)
  }
  return summary
}

/** Resolve a session id to its file, scanning workspaces when needed. */
export function findSessionFile(sessionId) {
  const root = sessionsRoot()
  let workspaces
  try {
    workspaces = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return null
  }
  const dirId = sessionId.startsWith('session-') ? sessionId : `session-${sessionId}`
  for (const ws of workspaces) {
    if (!ws.isDirectory()) continue
    const file = path.join(root, ws.name, dirId, SESSION_FILE)
    try {
      if (fs.statSync(file).isFile()) return file
    } catch {
      /* next workspace */
    }
  }
  return null
}

export function readSession(sessionId) {
  const file = findSessionFile(sessionId)
  if (!file) return null
  const records = readSessionRecords(file)
  if (!records) return null
  let createdAt = null
  let cwd = null
  let title = null
  for (const rec of records) {
    if (rec.type === 'session') {
      createdAt = rec.createdAt ?? null
      cwd = rec.cwd ?? null
    } else if (rec.type === 'session/title' && rec.data?.title) {
      title = rec.data.title
    }
  }
  return { sessionId, file, createdAt, cwd, title, records }
}
