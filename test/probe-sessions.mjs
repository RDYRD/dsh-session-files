/**
 * Why do unfamiliar sessions show up in the picker?
 * Enumerate every session file and report the header fields that distinguish
 * a main conversation from a subagent (delegated) one.
 */
import path from 'node:path'

import { listSessions, readSessionRecords } from '../lib/session-file.js'

const rows = []
for (const s of listSessions()) {
  const records = readSessionRecords(s.file) ?? []
  const header = records.find((r) => r.type === 'session') ?? {}
  const titleRec = records.filter((r) => r.type === 'session/title').pop()
  const firstUser = records.find((r) => r.type === 'user/message')
  const userText =
    typeof firstUser?.data?.text === 'string'
      ? firstUser.data.text
      : typeof firstUser?.data?.message?.content === 'string'
        ? firstUser.data.message.content
        : Array.isArray(firstUser?.data?.message?.content)
          ? firstUser.data.message.content.map((c) => c?.text ?? '').join(' ')
          : ''
  rows.push({
    sessionId: s.sessionId,
    title: s.title,
    titleSource: titleRec?.data?.source?.kind ?? null,
    depth: header.delegationDepth ?? null,
    preset: header.agentPreset ?? null,
    parent: header.parentSessionId ?? header.parent ?? null,
    turns: s.turnCount,
    sizeKB: Math.round(s.size / 1024),
    firstUser: userText.replace(/\s+/g, ' ').slice(0, 60),
  })
}

rows.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
console.log('depth preset           turns  sizeKB  titleSource  title / firstUser')
for (const r of rows) {
  console.log(
    `${String(r.depth).padEnd(5)} ${String(r.preset ?? '-').padEnd(16)} ${String(r.turns).padStart(5)}  ${String(r.sizeKB).padStart(6)}  ${String(r.titleSource ?? '-').padEnd(11)}  ${r.title ?? '(no title)'}  | ${r.firstUser || '(no user msg)'}`,
  )
}
console.log(`\ntotal ${rows.length}; depth>0 = ${rows.filter((r) => (r.depth ?? 0) > 0).length}`)
