import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

import { dshHome } from './session-file.js'

/**
 * Reversible deletion. Every entry gets its own directory under a
 * plugin-owned trash root so a restore is a single metadata lookup, and so a
 * file trashed from drive D: can still be kept alongside one from C:
 * (a `.trash/` inside each workspace cannot cover files outside the
 * workspace, which is exactly the case here — the sidebar lists absolute
 * paths anywhere on disk).
 */
export function trashRoot() {
  return path.join(dshHome(), 'dsh-session-files', 'trash')
}

/**
 * Files that never made it to the trash because they had already vanished from
 * disk. They cannot be restored, so "deleting" one really means "stop listing
 * it" — this keeps that decision across reloads instead of only in the tab's
 * component state.
 */
export function dismissedRoot() {
  return path.join(dshHome(), 'dsh-session-files', 'dismissed')
}

/** Case-insensitive on purpose: this only ever needs to match itself again. */
export function normalizeKey(target) {
  try {
    return path.resolve(target).toLowerCase()
  } catch {
    return String(target ?? '').toLowerCase()
  }
}

function dismissedFile(sessionId) {
  const safe = String(sessionId).replace(/[^a-zA-Z0-9._-]/g, '_')
  return path.join(dismissedRoot(), `${safe}.json`)
}

export function readDismissed(sessionId) {
  if (!sessionId) return new Set()
  try {
    const parsed = JSON.parse(fs.readFileSync(dismissedFile(sessionId), 'utf8'))
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function addDismissed(sessionId, paths) {
  if (!sessionId) return 0
  const set = readDismissed(sessionId)
  for (const target of paths) set.add(normalizeKey(target))
  ensureDir(dismissedRoot())
  fs.writeFileSync(dismissedFile(sessionId), JSON.stringify([...set], null, 2), 'utf8')
  return set.size
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function entryId() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${stamp}-${crypto.randomBytes(3).toString('hex')}`
}

/** Refuse the paths a mistaken click would regret. */
function assertTrashable(target) {
  const resolved = path.resolve(target)
  if (!path.isAbsolute(resolved)) throw new Error(`not an absolute path: ${target}`)
  if (resolved === path.parse(resolved).root) throw new Error('refusing to trash a drive root')
  const home = path.resolve(os.homedir())
  if (resolved === home) throw new Error('refusing to trash the home directory')
  if (resolved === path.resolve(dshHome())) throw new Error('refusing to trash the harness home')
  if (!fs.existsSync(resolved)) throw new Error(`no such file or directory: ${target}`)
  return resolved
}

function moveAcrossDevices(src, dst) {
  try {
    fs.renameSync(src, dst)
    return
  } catch (error) {
    if (error?.code !== 'EXDEV') throw error
  }
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.cpSync(src, dst, { recursive: true, dereference: false, preserveTimestamps: true })
    fs.rmSync(src, { recursive: true, force: true })
  } else {
    fs.copyFileSync(src, dst)
    fs.utimesSync(dst, stat.atime, stat.mtime)
    fs.unlinkSync(src)
  }
}

/**
 * Move each path into the trash. Returns one result per requested path; a
 * failure on one path never aborts the rest of the batch.
 */
export function trashPaths(paths, context = {}) {
  const root = ensureDir(trashRoot())
  const results = []
  for (const requested of paths) {
    let resolved
    try {
      resolved = assertTrashable(requested)
    } catch (error) {
      // A vanished file is not a failure worth a red banner: the caller drops it
      // from the list instead. Anything else (drive root, home dir, bad path) is
      // still reported as an error.
      const missing = !fs.existsSync(path.resolve(String(requested ?? '')))
      results.push({ path: requested, ok: false, missing, error: String(error.message ?? error) })
      continue
    }
    const id = entryId()
    const dir = path.join(root, id)
    try {
      ensureDir(dir)
      const baseName = path.basename(resolved)
      const payload = path.join(dir, baseName)
      const stat = fs.statSync(resolved)
      moveAcrossDevices(resolved, payload)
      const meta = {
        id,
        originalPath: resolved,
        baseName,
        payloadName: baseName,
        isDirectory: stat.isDirectory(),
        size: stat.isDirectory() ? null : stat.size,
        trashedAt: Date.now(),
        sessionId: context.sessionId ?? null,
        workspace: context.cwd ?? null,
      }
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8')
      results.push({ path: requested, ok: true, id, originalPath: resolved, size: meta.size })
    } catch (error) {
      try {
        fs.rmSync(dir, { recursive: true, force: true })
      } catch {
        /* best effort */
      }
      results.push({ path: requested, ok: false, error: String(error.message ?? error) })
    }
  }
  return results
}

/** Every trash entry, newest first, with a stale flag for a vanished payload. */
export function listTrash() {
  const root = trashRoot()
  let entries
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return []
  }
  const out = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const dir = path.join(root, entry.name)
    let meta
    try {
      meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'))
    } catch {
      continue
    }
    const payload = path.join(dir, meta.payloadName ?? meta.baseName ?? '')
    const exists = fs.existsSync(payload)
    out.push({
      ...meta,
      exists,
      originalExists: fs.existsSync(meta.originalPath),
      dir,
    })
  }
  out.sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0))
  return out
}

/**
 * Put one trashed entry back. Fails when the original location is occupied so
 * a restore can never clobber newer work; `.restored-N` is suggested instead.
 */
export function restoreEntry(id) {
  const root = trashRoot()
  const dir = path.join(root, id)
  let meta
  try {
    meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'))
  } catch {
    return { ok: false, error: 'trash entry not found' }
  }
  const payload = path.join(dir, meta.payloadName ?? meta.baseName)
  if (!fs.existsSync(payload)) return { ok: false, error: 'trash payload is missing' }
  if (fs.existsSync(meta.originalPath)) {
    return { ok: false, error: `already exists at the original path: ${meta.originalPath}` }
  }
  try {
    fs.mkdirSync(path.dirname(meta.originalPath), { recursive: true })
    moveAcrossDevices(payload, meta.originalPath)
    fs.rmSync(dir, { recursive: true, force: true })
    return { ok: true, path: meta.originalPath }
  } catch (error) {
    return { ok: false, error: String(error.message ?? error) }
  }
}

/** Permanently drop one trash entry (this is the only irreversible path). */
export function purgeEntry(id) {
  const dir = path.join(trashRoot(), id)
  if (!path.isAbsolute(dir)) return { ok: false, error: 'bad id' }
  try {
    fs.rmSync(dir, { recursive: true, force: true })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error.message ?? error) }
  }
}
