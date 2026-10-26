/**
 * Inspect the "Side: New thread" sessions: their header, how the title was set,
 * whether the inherited parent history is physically copied into the file
 * (which is why their artifact lists look like duplicates), and what the
 * first real messages are.
 */
import { listSessions, readSessionRecords } from '../lib/session-file.js'

const sessions = listSessions()
for (const s of sessions) {
  const records = readSessionRecords(s.file) ?? []
  const header = records.find((r) => r.type === 'session') ?? {}
  if ((header.delegationDepth ?? 0) === 0) continue

  console.log('='.repeat(78))
  console.log(`sessionId : ${s.sessionId}`)
  console.log(`title     : ${JSON.stringify(s.title)}   turns=${s.turnCount}  ${Math.round(s.size / 1024)}KB`)
  console.log(`header keys: ${Object.keys(header).join(', ')}`)
  console.log(`header    : ${JSON.stringify(header)}`)

  const titles = records.filter((r) => r.type === 'session/title')
  console.log(`title records (${titles.length}):`)
  for (const t of titles) console.log(`   ${JSON.stringify(t.data)}`)

  const counts = new Map()
  for (const r of records) counts.set(r.type, (counts.get(r.type) ?? 0) + 1)
  console.log('record types:', [...counts.entries()].map(([k, v]) => `${k}=${v}`).join(' '))

  const presented = records.filter((r) => r.type === 'deliverables/presented')
  console.log(`deliverables/presented rows: ${presented.length}`)
  for (const p of presented.slice(0, 3)) {
    console.log(`   turn ${p.data?.turn}: ${(p.data?.files ?? []).map((f) => f.path.split('\\').pop()).join(', ')}`)
  }

  // The boundary prompt marks where inherited history ends.
  const injection = records.find(
    (r) => r.type === 'user/message' && String(r.data?.source?.kind ?? '').startsWith('plugin:'),
  )
  console.log(`first plugin-injected message: ${injection ? JSON.stringify(injection.data).slice(0, 200) : 'none'}`)

  const users = records.filter((r) => r.type === 'user/message')
  console.log(`user/message count: ${users.length}`)
  for (const u of users.slice(0, 4)) {
    const d = u.data ?? {}
    const text =
      d.text ?? d.message?.content ?? (Array.isArray(d.content) ? d.content : '')
    const flat = typeof text === 'string' ? text : JSON.stringify(text)
    console.log(`   [${d.source?.kind ?? '?'}] ${flat.replace(/\s+/g, ' ').slice(0, 110)}`)
  }
}
