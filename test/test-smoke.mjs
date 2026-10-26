/**
 * Smoke test for the host half: lists conversations on disk, decodes the
 * newest/largest one, and reports what the artifact extractor found. Run with
 * `node test-smoke.mjs` from the plugin directory.
 */
import { extractArtifacts } from '../lib/artifacts.js'
import { listSessions, readSession } from '../lib/session-file.js'
import { listTrash, trashRoot } from '../lib/trash.js'

const sessions = listSessions()
console.log(`sessions on disk: ${sessions.length}`)

if (sessions.length === 0) {
  console.log('no sessions found — nothing else to test')
  process.exit(0)
}

const biggest = [...sessions].sort((a, b) => b.size - a.size)[0]
console.log(`largest session: ${biggest.sessionId} (${(biggest.size / 1024).toFixed(0)} KB), turns=${biggest.turnCount}`)
console.log(`  title: ${biggest.title}`)
console.log(`  cwd:   ${biggest.cwd}`)

const session = readSession(biggest.sessionId)
if (!session) {
  console.error('FAILED to read session')
  process.exit(1)
}
console.log(`records decoded: ${session.records.length}`)

const started = Date.now()
const artifacts = extractArtifacts(session.records, { cwd: session.cwd })
const elapsed = Date.now() - started
console.log(`extract took ${elapsed} ms`)
console.log(`deliverables: ${artifacts.deliverables.length}`)
console.log(`produced:     ${artifacts.produced.length}`)
console.log(`bytes total:  ${(artifacts.counts.bytes / 1024 / 1024).toFixed(2)} MB`)
console.log(`missing:      ${artifacts.counts.missing}`)

console.log('\n-- deliverables --')
for (const d of artifacts.deliverables.slice(0, 8)) {
  console.log(`  ${d.exists ? 'OK ' : 'GONE'} ${(d.size / 1024).toFixed(0).padStart(6)} KB  ${d.path}`)
  if (d.description) console.log(`        "${d.description}"`)
}

console.log('\n-- produced (top 12 by mtime) --')
for (const p of artifacts.produced.slice(0, 12)) {
  console.log(`  ${p.exists ? 'OK ' : 'GONE'} ${(p.size / 1024).toFixed(0).padStart(6)} KB  [${p.tools.join(',')}]  ${p.path}`)
}

console.log(`\ntrash root: ${trashRoot()}`)
console.log(`trash entries: ${listTrash().length}`)
