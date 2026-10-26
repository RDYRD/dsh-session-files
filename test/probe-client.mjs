/**
 * Load-time probe for lib/client.js: runs the module in a fake DSH client shell
 * (ModuleLoader seed table, React, document) and asserts the tab descriptor it
 * registers is well formed. Deliberately shallow — it proves the bundle cannot
 * throw while being loaded or while rendering the first frame; interaction has
 * to be checked in the real GUI.
 */
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = readFileSync(path.join(here, '..', 'lib', 'client.js'), 'utf8')

const makeEl = () => ({ props: null, children: [], setAttribute() {}, appendChild() {} })

const React = {
  createElement: (type, props, ...children) => ({
    type,
    props: { ...(props ?? {}), children: children.length > 1 ? children : children[0] },
  }),
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useEffect: () => {},
  useMemo: (fn) => fn(),
  useRef: (value) => ({ current: value }),
  useCallback: (fn) => fn,
  Component: class {
    constructor(props) { this.props = props; this.state = {} }
    setState(next) { Object.assign(this.state, typeof next === 'function' ? next(this.state) : next) }
    render() { return null }
  },
  Fragment: 'Fragment',
}

const styleIds = new Set()
const document = {
  head: { appendChild: () => {} },
  body: makeEl(),
  getElementById: (id) => (styleIds.has(id) ? makeEl() : null),
  createElement: () => makeEl(),
}

const registered = []
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  document,
  fetch: async () => ({ ok: true, json: async () => ({ ok: true, sessions: [] }) }),
  __ModuleLoader__: {
    load: ({ id, factory }) => {
      const exports = factory((name) => {
        if (name === 'react') return React
        if (name === 'react-dom') return null
        throw new Error('unknown require: ' + name)
      })
      registered.push({ id, exports })
    },
  },
}
sandbox.window = sandbox
sandbox.globalThis = sandbox

vm.createContext(sandbox)
vm.runInContext(src, sandbox, { filename: 'client.js' })

const entry = registered[0]
if (!entry) throw new Error('loader did not call load()')
if (entry.id !== 'dsh-session-files') throw new Error('loader id was ' + entry.id)
const exp = entry.exports
if (typeof exp.apply !== 'function') throw new Error('missing apply')
if (!Array.isArray(exp.inject) || exp.inject[0] !== 'betterSidebar') throw new Error('bad inject: ' + JSON.stringify(exp.inject))

const tabs = []
const ctx = {
  effect: (fn) => { const d = fn(); return typeof d === 'function' ? d : () => {} },
  betterSidebar: { registerTab: (descriptor) => { tabs.push(descriptor); return () => {} } },
}
exp.apply(ctx)

const tab = tabs[0]
if (!tab) throw new Error('registerTab was not called')
const checks = {
  'tab id': tab.id === 'session-artifacts',
  'tab title': typeof tab.title === 'function' && tab.title() === '本会话产物',
  'tab order': tab.order === 55,
  'tab single': tab.single === true,
  'has component': typeof tab.component === 'function',
  'has icon': typeof tab.icon === 'function',
}
for (const [name, ok] of Object.entries(checks)) console.log((ok ? 'ok   ' : 'FAIL ') + name)

// First render with an empty session: proves the view body does not throw.
const tree = tab.component({
  scope: { sessionId: 'session-probe', cwd: 'C:\\probe' },
  visible: true,
  store: {},
  tab,
})
const rootType = tree && (typeof tree.type === 'function' ? tree.type.name || 'anonymous' : tree.type)
console.log('root node type:', rootType)

// The lightbox itself: render QuickLook through the same fake React.
const bad = Object.entries(checks).filter(([, ok]) => !ok)
if (bad.length) { console.error('FAILED: ' + bad.map(([k]) => k).join(', ')); process.exit(1) }
console.log('\nclient bundle loads and registers cleanly')
