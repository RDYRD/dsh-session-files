/**
 * Compare each delegated (side/fork) session against its parent:
 *  - does the parent still exist on disk?
 *  - is every artifact in the child ALSO in the parent (inherited duplicate),
 *    or does the child hold artifacts the parent never had?
 */
import { extractArtifacts } from '../lib/artifacts.js'
import { findSessionFile, listSessions, readSession } from '../lib/session-file.js'

const byId = new Map(listSessions().map((s) => [s.sessionId, s]))
const pathsOf = (sessionId) => {
  const session = readSession(sessionId)
  if (!session) return null
  const { deliverables, produced } = extractArtifacts(session.records, { cwd: session.cwd ?? '' })
  return {
    cwd: session.cwd,
    all: new Set([...deliverables, ...produced].map((a) => a.path.toLowerCase())),
    deliverables: new Set(deliverables.map((a) => a.path.toLowerCase())),
    producedCount: produced.length,
    deliverableCount: deliverables.length,
    firstUsers: session.records
      .filter((r) => r.type === 'user/message')
      .slice(0, 1)
      .map((r) => {
        const d = r.data ?? {}
        const t = d.text ?? d.message?.content
        return typeof t === 'string' ? t : JSON.stringify(t)
      }),
  }
}

const children = []
for (const s of byId.values()) {
  const session = readSession(s.sessionId)
  const header = session?.records?.find((r) => r.type === 'session')
  if (!header || (header.delegationDepth ?? 0) === 0) continue
  children.push({ s, header, info: pathsOf(s.sessionId) })
}

for (const { s, header, info } of children) {
  const parentId = String(header.parentSession ?? '').replace(/^session-/, '')
  const parentOnDisk = Boolean(findSessionFile(parentId))
  const parentInfo = parentOnDisk ? pathsOf(parentId) : null

  const inherited = parentInfo ? [...info.all].filter((p) => parentInfo.all.has(p)) : []
  const own = parentInfo ? [...info.all].filter((p) => !parentInfo.all.has(p)) : [...info.all]

  console.log('='.repeat(78))
  console.log(`child  ${s.sessionId}  title=${JSON.stringify(s.title)}  turns=${s.turnCount}`)
  console.log(`parent ${parentId}  onDisk=${parentOnDisk}  parentTitle=${JSON.stringify(parentInfo ? byId.get(parentId)?.title : null)}`)
  console.log(`child artifacts: ${info.deliverableCount} deliverables + ${info.producedCount} produced = ${info.all.size} unique`)
  console.log(`  inherited from parent : ${inherited.length}`)
  console.log(`  unique to this child  : ${own.length}`)
  if (own.length) {
    console.log('  own paths:')
    for (const p of own.slice(0, 12)) console.log(`    ${p}`)
    if (own.length > 12) console.log(`    ... +${own.length - 12} more`)
  }
  console.log(`  first user msg: ${(info.firstUsers[0] ?? '').replace(/\s+/g, ' ').slice(0, 80)}`)
}
