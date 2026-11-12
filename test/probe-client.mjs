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

// ---- pure renderers the lightbox leans on ----------------------------------
const internals = exp.__test
if (!internals) throw new Error('missing __test seam')
const extra = []
const check = (name, ok) => {
  extra.push([name, !!ok])
  console.log((ok ? 'ok   ' : 'FAIL ') + name)
}

const collectTypes = (root) => {
  const types = new Set()
  const classes = new Set()
  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!node || typeof node !== 'object') return
    if (typeof node.type === 'string') types.add(node.type)
    const cn = node.props && node.props.className
    if (typeof cn === 'string') classes.add(cn)
    const kids = node.props && node.props.children
    if (Array.isArray(kids)) kids.forEach(walk)
    else walk(kids)
  }
  walk(root)
  return { types, classes }
}

check('pdf is its own kind', internals.kindOf('C:\\w\\a.pdf') === 'pdf')
check('office is its own kind', internals.kindOf('C:\\w\\a.docx') === 'office')
check('markdown stays a text kind', internals.kindOf('C:\\w\\a.md') === 'doc')
check('code kind unchanged', internals.kindOf('C:\\w\\a.py') === 'code')

const hi = collectTypes(internals.highlightSource('const x = 42 // note\nlet s = "hi"', 'js'))
check('highlight marks keywords', hi.classes.has('dsa-tk-kw'))
check('highlight marks comments', hi.classes.has('dsa-tk-com'))
check('highlight marks numbers', hi.classes.has('dsa-tk-num'))
check('highlight marks strings', hi.classes.has('dsa-tk-str'))

const md = collectTypes(internals.renderMarkdown('# Title\n\n- one\n- two\n\n```js\nx\n```\n\n> quote'))
check('markdown renders headings', md.types.has('h1'))
check('markdown renders code fences', md.types.has('pre'))
check('markdown renders quotes', md.types.has('blockquote'))

const rows = internals.parseDelimited('a,b\n1,"x,y"\n2,"q""uote"')
check('csv splits columns', Array.isArray(rows[0]) && rows[0].join('|') === 'a|b')
check('csv keeps quoted commas', rows[1][1] === 'x,y')
check('csv unescapes doubled quotes', rows[2][1] === 'q"uote')

check(
  'locate degrades without a DOM',
  (await internals.locateInConversation({ path: 'C:\\w\\a.png' }, 'C:\\w')) === 'missing',
)
check('load-earlier probe degrades without a DOM', internals.findLoadEarlierButton() === null)
check('presented-card probe degrades without a DOM', internals.findPresentedCard({ path: 'C:\\w\\a.png' }, 'C:\\w') === null)

// A card from an early Turn is not mounted until the reader pulls history in:
// locating must press "load earlier" itself and then find the card.
{
  const card = {
    hasAttribute: (name) => name === 'title',
    getAttribute: () => 'C:/w/a.png',
    querySelector: () => null,
    scrollIntoView() {},
    classList: { add() {}, remove() {} },
  }
  let clicks = 0
  let revealed = false
  const olderButton = {
    disabled: false,
    textContent: '加载更早',
    click() {
      clicks += 1
      revealed = true
    },
  }
  const realQuery = document.querySelectorAll
  document.querySelectorAll = (selector) => {
    if (selector === '[data-presented-file]') return revealed ? [card] : []
    if (selector === 'div[class*="_older"] > button') return revealed ? [] : [olderButton]
    if (selector === 'button') return revealed ? [] : [olderButton]
    return []
  }
  const result = await internals.locateInConversation({ path: 'C:\\w\\a.png' }, 'C:\\w')
  document.querySelectorAll = realQuery
  check('locate presses load-earlier then finds the card', clicks === 1 && result === 'found', `${clicks} click(s), ${result}`)
}

// The lightbox itself: render QuickLook through the same fake React.
const bad = [...Object.entries(checks), ...extra].filter(([, ok]) => !ok)
if (bad.length) { console.error('FAILED: ' + bad.map(([k]) => k).join(', ')); process.exit(1) }
console.log('\nclient bundle loads and registers cleanly')
