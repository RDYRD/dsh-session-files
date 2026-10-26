import fs from 'node:fs'
import path from 'node:path'

/** Absolute-path sniffing: drive letter or POSIX root, no globs, no newlines. */
function looksAbsolute(value) {
  if (typeof value !== 'string') return false
  const s = value.trim()
  if (s.length < 4 || s.length > 900) return false
  if (/[\r\n]/.test(s)) return false
  if (/[*?<>|]/.test(s)) return false
  return /^[A-Za-z]:[\\/]/.test(s) || /^\//.test(s)
}

/** Paths the harness owns; they are noise in an "artifacts" list. */
const NOISE_SEGMENTS = [
  `${path.sep}.dsh${path.sep}`,
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.git${path.sep}`,
  `${path.sep}__pycache__${path.sep}`,
]

function isNoise(p) {
  const lowered = p.toLowerCase()
  if (lowered.endsWith('.pyc')) return true
  const withSep = p.endsWith(path.sep) ? p : p + path.sep
  return NOISE_SEGMENTS.some((seg) => withSep.includes(seg))
}

function safeParseArguments(raw) {
  if (typeof raw !== 'string') return raw && typeof raw === 'object' ? raw : null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function collectAbsolutePaths(value, out, depth = 0) {
  if (depth > 8) return
  if (typeof value === 'string') {
    if (looksAbsolute(value)) out.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectAbsolutePaths(item, out, depth + 1)
    return
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) collectAbsolutePaths(value[key], out, depth + 1)
  }
}

/**
 * Tools whose arguments describe a file being WRITTEN, mapped to the argument
 * keys that carry the destination. Anything else is treated as read-only, so a
 * `read`/`grep` path never lands in the produced list.
 */
const WRITE_ARG_KEYS = {
  write: ['file_path'],
  edit: ['file_path'],
  create_file: ['file_path'],
  present: ['files'],
  blender_export: ['output_path'],
  blender_python: ['save_path'],
  blender_render: ['output_path'],
  blender_preview: ['output_path'],
  blender_render_frames: ['output_dir'],
  blender_import: ['save_path'],
  godot_create_script: ['script_path'],
  godot_export_project: ['output_path'],
  godot_headless_op: ['output_path', 'params'],
  godot_set_project_setting: ['project_path'],
  blender_helper_run: ['arguments'],
  office_create: ['path'],
  office_export_pdf: ['output_path'],
  vision_crop: ['image'],
  vision_trace: ['image'],
}

function statFile(p) {
  try {
    const st = fs.statSync(p)
    return {
      exists: true,
      isDirectory: st.isDirectory(),
      size: st.size,
      mtime: st.mtimeMs,
    }
  } catch {
    return { exists: false, isDirectory: false, size: 0, mtime: 0 }
  }
}

/**
 * Turn one conversation's records into the two lists the sidebar shows:
 * what was formally delivered (`present`), and every file a write-shaped tool
 * touched. Results are de-duplicated by absolute path and enriched with live
 * filesystem state so a deleted file can be shown as gone instead of silently
 * vanishing from the list.
 */
export function extractArtifacts(records, options = {}) {
  const cwd = options.cwd ?? null
  // A file presented twice (a revised delivery of the same plan, say) is still
  // ONE artifact: keep the latest description and turn, and remember the earlier
  // turns so the row can show how many times it was delivered.
  const deliverableMap = new Map()
  const produced = new Map()
  const presentedPaths = new Set()

  for (const rec of records) {
    if (!rec || typeof rec !== 'object') continue
    if (rec.type === 'deliverables/presented') {
      const data = rec.data ?? {}
      const files = Array.isArray(data.files) ? data.files : []
      for (const file of files) {
        const p = file?.path
        if (!looksAbsolute(p)) continue
        const key = path.resolve(p)
        presentedPaths.add(key)
        const previous = deliverableMap.get(key)
        if (previous) {
          previous.description = file?.description ?? previous.description
          previous.turn = data.turn ?? previous.turn
          previous.callId = data.callId ?? previous.callId
          if (!previous.turns.includes(data.turn)) previous.turns.push(data.turn)
          continue
        }
        deliverableMap.set(key, {
          path: p,
          description: file?.description ?? '',
          turn: data.turn ?? null,
          callId: data.callId ?? null,
          turns: [data.turn],
        })
      }
      continue
    }
    if (rec.type !== 'tool/call') continue
    const data = rec.data ?? {}
    const toolName = data.name
    const keys = WRITE_ARG_KEYS[toolName]
    if (!keys) continue
    const args = safeParseArguments(data.arguments)
    if (!args) continue
    const found = []
    for (const key of keys) {
      if (args[key] === undefined) continue
      collectAbsolutePaths(args[key], found)
    }
    for (const raw of found) {
      const p = raw.trim()
      if (isNoise(p)) continue
      const key = path.resolve(p)
      const prev = produced.get(key)
      if (prev) {
        prev.tools.add(toolName)
        prev.lastTurn = data.turn ?? prev.lastTurn
        continue
      }
      produced.set(key, {
        path: p,
        tools: new Set([toolName]),
        firstTurn: data.turn ?? null,
        lastTurn: data.turn ?? null,
        presented: false,
      })
    }
  }

  const decorate = (entry) => {
    const stat = statFile(entry.path)
    return { ...entry, ...stat }
  }

  const deliverableList = [...deliverableMap.values()].map((d) => {
    const decorated = decorate(d)
    return { ...decorated, inWorkspace: cwd ? isInside(d.path, cwd) : null }
  })

  const producedList = []
  for (const [key, entry] of produced) {
    // Files that were also formally presented belong to the deliverables list.
    if (presentedPaths.has(key)) continue
    producedList.push(
      decorate({
        path: entry.path,
        tools: [...entry.tools],
        firstTurn: entry.firstTurn,
        lastTurn: entry.lastTurn,
        inWorkspace: cwd ? isInside(entry.path, cwd) : null,
      }),
    )
  }

  producedList.sort((a, b) => (b.mtime || 0) - (a.mtime || 0))

  return {
    cwd,
    deliverables: deliverableList,
    produced: producedList,
    counts: {
      deliverables: deliverableList.length,
      produced: producedList.length,
      missing:
        deliverableList.filter((d) => !d.exists).length +
        producedList.filter((p) => !p.exists).length,
      bytes:
        deliverableList.reduce((sum, d) => sum + (d.exists ? d.size : 0), 0) +
        producedList.reduce((sum, p) => sum + (p.exists ? p.size : 0), 0),
    },
  }
}

/** True when `p` resolves inside `root` (used to flag out-of-workspace files). */
export function isInside(p, root) {
  try {
    const rel = path.relative(path.resolve(root), path.resolve(p))
    return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
  } catch {
    return false
  }
}
