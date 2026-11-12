window.__ModuleLoader__.load({
  id: 'dsh-session-files',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const API = '/api/dsh-session-files'

    /**
     * React is a platform seed word (the built-in UI and every sidebar tab are
     * React trees), so it resolves here; the guard keeps a harness whose module
     * table changed from blanking the sidebar with a load-time throw.
     */
    let React = null
    try {
      React = require('react')
    } catch {
      React = null
    }

    const h = (type, props, ...children) => {
      if (React && typeof React.createElement === 'function') return React.createElement(type, props, ...children)
      return { type, props: { ...(props ?? {}), children: children.length > 1 ? children : children[0] } }
    }

    // ---------------------------------------------------------------------
    // Styles. Everything leans on currentColor and translucent greys so the tab
    // follows the active light/dark theme without hard-coding a palette.
    // ---------------------------------------------------------------------
    const STYLE_ID = 'dsa-style'

    function ensureStyle() {
      if (typeof document === 'undefined') return
      if (document.getElementById(STYLE_ID)) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = `
        .dsa-root { display:flex; flex-direction:column; height:100%; max-height:100%; min-height:0; overflow:hidden; font-size:12px; color:inherit; position:relative; }

        /* top bar */
        .dsa-bar { display:flex; align-items:center; gap:3px; padding:6px 7px; border-bottom:1px solid rgba(127,127,127,.16); flex:none; }
        .dsa-title { flex:1; min-width:0; display:flex; align-items:center; gap:4px; cursor:pointer; border-radius:6px; padding:4px 5px; }
        .dsa-title:hover { background:rgba(127,127,127,.12); }
        .dsa-title-text { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; font-size:13px; }
        .dsa-icon-btn { flex:none; display:inline-flex; align-items:center; justify-content:center; width:23px; height:23px; border-radius:6px; border:none; background:transparent; color:inherit; cursor:pointer; opacity:.7; }
        .dsa-icon-btn:hover { background:rgba(127,127,127,.16); opacity:1; }
        .dsa-icon-btn[disabled] { opacity:.28; cursor:default; }
        .dsa-icon-btn.on { background:rgba(127,127,127,.2); opacity:1; }

        /* summary strip */
        .dsa-summary { display:flex; flex-wrap:wrap; gap:5px; padding:7px 8px 5px; flex:none; }
        .dsa-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 7px; border-radius:20px; background:rgba(127,127,127,.13); font-size:11px; }
        .dsa-pill b { font-weight:650; }
        .dsa-pill.warn { background:rgba(229,72,77,.16); }
        .dsa-pill.btn { border:0; cursor:pointer; color:inherit; font-family:inherit; font-size:11px; }
        .dsa-pill.btn:hover { background:rgba(229,72,77,.28); }

        /* session picker */
        .dsa-picker { flex:none; max-height:38vh; overflow-y:auto; overscroll-behavior:contain; padding:4px; border-bottom:1px solid rgba(127,127,127,.16); background:rgba(127,127,127,.045); }
        .dsa-picker::-webkit-scrollbar { width:8px; }
        .dsa-picker::-webkit-scrollbar-thumb { background:rgba(127,127,127,.35); border-radius:4px; }
        .dsa-picker-head { display:flex; align-items:center; gap:6px; padding:2px 4px 6px; position:sticky; top:0; background:rgba(127,127,127,.045); backdrop-filter:blur(2px); z-index:1; font-size:13px; }
        .dsa-picker-row { display:flex; align-items:center; gap:6px; padding:5px 6px; border-radius:6px; cursor:pointer; }
        .dsa-picker-row:hover { background:rgba(127,127,127,.14); }
        .dsa-picker-row.current { background:rgba(127,127,127,.16); font-weight:600; }
        .dsa-picker-title { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .dsa-picker-meta { font-size:10.5px; opacity:.55; flex:none; font-variant-numeric:tabular-nums; }
        .dsa-derived-tag { flex:none; font-size:9.5px; line-height:1; padding:2px 4px; border-radius:3px;
          background:rgba(127,127,127,.18); opacity:.7; letter-spacing:.02em; }
        .dsa-picker-foot { display:block; width:100%; margin-top:5px; padding:5px 6px; border:0; border-radius:6px;
          background:transparent; color:inherit; font-family:inherit; font-size:10.5px; opacity:.55;
          text-align:left; cursor:pointer; }
        .dsa-picker-foot:hover { background:rgba(127,127,127,.12); opacity:.8; }

        /* list */
        .dsa-body { flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:2px 6px 14px; }
        .dsa-body::-webkit-scrollbar { width:9px; }
        .dsa-body::-webkit-scrollbar-thumb { background:rgba(127,127,127,.3); border-radius:5px; }
        .dsa-body::-webkit-scrollbar-thumb:hover { background:rgba(127,127,127,.5); }

        .dsa-group { display:flex; align-items:center; gap:6px; padding:9px 5px 5px; font-weight:650; font-size:13.5px; letter-spacing:.01em; cursor:pointer; user-select:none; }
        .dsa-group:hover { opacity:.92; }
        .dsa-group-dot { width:7px; height:7px; border-radius:50%; flex:none; }
        .dsa-group-dot.deliver { background:#4c9aff; }
        .dsa-group-dot.produced { background:rgba(127,127,127,.65); }
        .dsa-group .dsa-count { font-weight:400; font-size:11.5px; opacity:.55; font-variant-numeric:tabular-nums; }

        .dsa-row { display:flex; align-items:flex-start; gap:8px; padding:6px 6px; border-radius:7px; cursor:pointer; }
        .dsa-row:hover { background:rgba(127,127,127,.11); }
        .dsa-thumb { flex:none; width:30px; height:30px; border-radius:5px; object-fit:cover; background:rgba(127,127,127,.12); border:1px solid rgba(127,127,127,.18); display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .dsa-row-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
        .dsa-row-top { display:flex; align-items:baseline; gap:6px; min-width:0; }
        .dsa-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .dsa-name.gone { text-decoration:line-through; opacity:.5; }
        .dsa-ext { flex:none; font-size:10px; text-transform:uppercase; letter-spacing:.03em; opacity:.45; }
        .dsa-meta { display:flex; align-items:center; gap:5px; font-size:10.5px; opacity:.58; min-width:0; font-variant-numeric:tabular-nums; }
        .dsa-meta .dsa-dir { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; direction:rtl; text-align:left; }
        .dsa-meta .dot { opacity:.4; }
        .dsa-desc { opacity:.62; font-size:10.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:1px; }
        .dsa-actions { flex:none; display:flex; gap:3px; opacity:0; transition:opacity .1s; align-self:center; }
        .dsa-row:hover .dsa-actions { opacity:1; }
        .dsa-mini { border:1px solid rgba(127,127,127,.28); background:transparent; color:inherit; border-radius:5px; font-size:10.5px; padding:1px 5px; cursor:pointer; line-height:1.5; }
        .dsa-mini:hover { background:rgba(127,127,127,.16); }
        .dsa-mini.danger:hover { background:rgba(229,72,77,.18); border-color:rgba(229,72,77,.55); color:#e5484d; }

        .dsa-empty { padding:26px 16px; text-align:center; opacity:.55; line-height:1.8; font-size:11.5px; }

        /* quick-look: fills the tab body in place — no portal, no full-window layer */
        .dsa-lb { position:absolute; inset:0; z-index:6; display:flex; flex-direction:column; background:#1b1c20; color:#e8eaed; animation:dsa-lb-in .1s ease-out; }
        @keyframes dsa-lb-in { from { opacity:0 } to { opacity:1 } }
        .dsa-lb-head { flex:none; display:flex; align-items:center; gap:4px; padding:7px 7px 6px; border-bottom:1px solid rgba(255,255,255,.09); }
        .dsa-lb-name { flex:1; min-width:0; display:flex; align-items:center; gap:5px; overflow:hidden; font-weight:600; font-size:11.5px; }
        .dsa-lb-name > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .dsa-lb-btn { display:inline-flex; align-items:center; justify-content:center; width:23px; height:23px; flex:none; border:0; border-radius:5px; background:rgba(255,255,255,.09); color:#e6e8ec; cursor:pointer; padding:0; }
        .dsa-lb-btn:hover { background:rgba(255,255,255,.2); }
        .dsa-lb-btn:disabled { opacity:.26; cursor:default; }
        .dsa-lb-body { flex:1; min-height:0; display:flex; align-items:center; justify-content:center; padding:5px; overflow:auto; }
        .dsa-lb-img { max-width:100%; max-height:100%; object-fit:contain; border-radius:4px; box-shadow:0 3px 16px rgba(0,0,0,.5); }
        .dsa-lb-video { max-width:100%; max-height:100%; border-radius:4px; }
        .dsa-lb-audio { width:100%; }
        .dsa-lb-text { width:100%; height:100%; margin:0; padding:8px 9px; overflow:auto; border-radius:4px; background:rgba(255,255,255,.05); color:#d8dbe0; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; line-height:1.55; white-space:pre-wrap; word-break:break-word; tab-size:2; }
        .dsa-lb-note { padding:26px 14px; text-align:center; color:rgba(255,255,255,.66); line-height:1.8; font-size:11px; }
        .dsa-lb-foot { flex:none; display:flex; align-items:center; gap:7px; padding:5px 8px 7px; border-top:1px solid rgba(255,255,255,.09); color:rgba(255,255,255,.5); font-size:10px; }
        .dsa-lb-foot .dsa-path { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .dsa-lb-count { flex:none; font-variant-numeric:tabular-nums; }

        /* quick-look: PDF streams straight into the built-in viewer, when the
           host Chromium exposes one; otherwise the frame stays blank. */
        .dsa-lb-pdf { width:100%; height:100%; border:0; border-radius:4px; background:#fff; }
        .dsa-lb-pdf-note { width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; }

        /* quick-look: Markdown */
        .dsa-lb-md { width:100%; height:100%; overflow:auto; padding:10px 14px 18px; background:rgba(255,255,255,.04); border-radius:4px; font-size:12px; line-height:1.72; color:#dfe2e7; }
        .dsa-md-h1 { font-size:17px; font-weight:700; margin:14px 0 8px; line-height:1.35; }
        .dsa-md-h2 { font-size:15px; font-weight:650; margin:13px 0 6px; line-height:1.35; }
        .dsa-md-h3, .dsa-md-h4 { font-size:13px; font-weight:650; margin:11px 0 5px; }
        .dsa-md-p { margin:0 0 9px; }
        .dsa-md-li { margin:0 0 3px 17px; list-style:disc; }
        .dsa-md-quote { border-left:3px solid rgba(255,255,255,.24); padding:1px 10px; margin:0 0 9px; color:rgba(255,255,255,.72); }
        .dsa-md-code { background:rgba(255,255,255,.11); padding:1px 4px; border-radius:3px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; }
        .dsa-md-pre { background:rgba(0,0,0,.34); padding:8px 10px; border-radius:5px; overflow:auto; margin:0 0 10px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; line-height:1.55; white-space:pre; }
        .dsa-md-hr { border:0; border-top:1px solid rgba(255,255,255,.16); margin:12px 0; }
        .dsa-md-a { color:#79b8ff; text-decoration:underline; }

        /* quick-look: CSV / TSV */
        .dsa-table-wrap { width:100%; height:100%; overflow:auto; background:rgba(255,255,255,.04); border-radius:4px; }
        .dsa-table { border-collapse:collapse; font-size:11px; width:100%; font-variant-numeric:tabular-nums; }
        .dsa-table th, .dsa-table td { border:1px solid rgba(255,255,255,.13); padding:3px 7px; text-align:left; max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .dsa-table th { background:rgba(255,255,255,.1); position:sticky; top:0; font-weight:650; }
        .dsa-table tbody tr:nth-child(even) { background:rgba(255,255,255,.035); }

        /* quick-look: token colours for code */
        .dsa-tk-kw { color:#c792ea; }
        .dsa-tk-str { color:#c3e88d; }
        .dsa-tk-num { color:#f78c6c; }
        .dsa-tk-com { color:#697098; font-style:italic; }
        .dsa-tk-fn { color:#82aaff; }

        /* jump-to-conversation flash */
        .dsa-locate-hit { outline:2px solid #4c9aff !important; outline-offset:2px; border-radius:8px; }

        /* trash */
        .dsa-trash { flex:none; max-height:42vh; overflow-y:auto; border-top:1px solid rgba(127,127,127,.18); padding:4px 6px 10px; }
        .dsa-trash::-webkit-scrollbar { width:8px; }
        .dsa-trash::-webkit-scrollbar-thumb { background:rgba(127,127,127,.32); border-radius:4px; }

        .dsa-toast { position:absolute; left:50%; bottom:12px; transform:translateX(-50%); max-width:88%; padding:5px 10px; font-size:11px; background:rgba(28,28,30,.94); color:#fff; border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,.28); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; z-index:9; }
        .dsa-err { margin:6px; padding:7px 9px; border-radius:6px; background:rgba(229,72,77,.14); border:1px solid rgba(229,72,77,.38); font-size:11px; line-height:1.6; word-break:break-word; }
      `
      document.head.appendChild(style)
    }

    // ---------------------------------------------------------------------
    // Formatting helpers
    // ---------------------------------------------------------------------
    function fmtBytes(n) {
      if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let value = n
      let unit = 0
      while (value >= 1024 && unit < units.length - 1) {
        value /= 1024
        unit++
      }
      return (value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)) + ' ' + units[unit]
    }

    function fmtTime(ms) {
      if (!ms) return ''
      try {
        const d = new Date(ms)
        const now = Date.now()
        const diff = now - ms
        if (diff < 60_000) return '刚刚'
        if (diff < 3600_000) return Math.floor(diff / 60_000) + ' 分钟前'
        if (diff < 86400_000) return Math.floor(diff / 3600_000) + ' 小时前'
        if (diff < 7 * 86400_000) return Math.floor(diff / 86400_000) + ' 天前'
        return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      } catch {
        return ''
      }
    }

    const SEP = /[\\/]/

    function baseName(p) {
      if (typeof p !== 'string') return ''
      const parts = p.split(SEP)
      return parts[parts.length - 1] || p
    }

    function dirName(p) {
      if (typeof p !== 'string') return ''
      const idx = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'))
      return idx > 0 ? p.slice(0, idx) : ''
    }

    function extName(p) {
      const name = baseName(p)
      const dot = name.lastIndexOf('.')
      return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
    }

    /** Relative when the file sits under the session cwd, absolute otherwise. */
    function relativeTo(p, cwd) {
      if (!cwd || typeof p !== 'string') return p
      const root = cwd.replace(/[\\/]+$/, '')
      const lowered = p.toLowerCase()
      const rootLower = root.toLowerCase()
      if (lowered === rootLower) return '.'
      if (lowered.startsWith(rootLower + '\\') || lowered.startsWith(rootLower + '/')) {
        return p.slice(root.length + 1)
      }
      return p
    }

    // ---------------------------------------------------------------------
    // File kinds — drive the thumbnail fallback icon and the preview mode.
    // ---------------------------------------------------------------------
    const KIND_BY_EXT = new Map()
    const registerKind = (kind, list) => {
      for (const ext of list) KIND_BY_EXT.set(ext, kind)
    }
    registerKind('image', ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico', 'svg', 'tif', 'tiff'])
    registerKind('video', ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'])
    registerKind('audio', ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'])
    registerKind('model', ['glb', 'gltf', 'fbx', 'obj', 'stl', 'blend', 'usd', 'usda', 'usdc', 'dae', 'ply', 'blend1'])
    registerKind('vector', ['dxf', 'dwg', 'ai', 'eps', 'skp'])
    // Text-ish formats the lightbox can read as UTF-8 and render itself.
    registerKind('doc', ['md', 'txt', 'csv', 'html', 'htm'])
    // A PDF is a container, not text: stream it into an <iframe> (see QuickLook).
    registerKind('pdf', ['pdf'])
    // Office containers have no in-window renderer; we say so instead of
    // dumping their compressed bytes into a <pre>.
    registerKind('office', ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'odt', 'ods', 'odp'])
    registerKind('code', ['json', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'py', 'gd', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'c', 'h', 'cpp', 'hpp', 'cs', 'rs', 'go', 'java', 'sh', 'ps1', 'bat', 'css', 'scss'])
    registerKind('archive', ['zip', 'tar', 'gz', '7z', 'rar', 'xz'])

    function kindOf(p) {
      return KIND_BY_EXT.get(extName(p)) ?? 'other'
    }

    function isRasterImage(p) {
      const kind = kindOf(p)
      const ext = extName(p)
      return kind === 'image' && ext !== 'svg' && ext !== 'tif' && ext !== 'tiff'
    }

    function rawUrl(p, mode) {
      const query = `path=${encodeURIComponent(p)}${mode ? `&mode=${mode}` : ''}`
      return `${API}/raw?${query}`
    }

    // ---------------------------------------------------------------------
    // Preview renderers — syntax highlighting, Markdown, delimited tables.
    // Hand-rolled on purpose: this client bundle has no build step, so there
    // is no place to vendor a highlighting or markdown package.
    // ---------------------------------------------------------------------
    const CODE_LANGS = {
      js: 'js', mjs: 'js', cjs: 'js', jsx: 'js', ts: 'js', tsx: 'js', json: 'js',
      py: 'py', gd: 'py',
      sh: 'sh', bash: 'sh', zsh: 'sh', ps1: 'sh', bat: 'sh',
      yml: 'yaml', yaml: 'yaml', toml: 'yaml', ini: 'cfg', cfg: 'cfg',
      c: 'c', h: 'c', cpp: 'c', hpp: 'c', cs: 'c', rs: 'c', go: 'c', java: 'c',
      css: 'css', scss: 'css', html: 'html', htm: 'html', xml: 'html', svg: 'html',
    }

    const KEYWORDS = {
      js: 'const let var function return if else for while do switch case break continue new class extends super import export from default async await try catch finally throw typeof instanceof of null undefined true false this static get set yield delete void',
      py: 'def class return if elif else for while break continue pass import from as with try except finally raise in is not and or None True False lambda yield global nonlocal assert del await',
      sh: 'if then else fi for while do done case esac function return export local echo cd set unset exit source read',
      yaml: 'true false null yes no on off',
      cfg: 'true false null on off',
      c: 'int char float double void long short unsigned signed struct enum union typedef static const return if else for while switch case break continue sizeof public private protected virtual new delete namespace using template typename auto include define',
      css: 'important media supports keyframes import font-face root',
      html: 'html head body div span a p ul ol li table tr td th img script style link meta input button form section header footer nav',
    }

    const KEYWORD_SET = new Set(
      Object.keys(KEYWORDS)
        .map((key) => KEYWORDS[key])
        .join(' ')
        .split(/\s+/)
        .filter(Boolean),
    )

    // Beyond this the DOM cost of one <span> per token outweighs the benefit.
    const HIGHLIGHT_LIMIT = 160000
    const TABLE_LIMIT = 400

    function highlightSource(source, ext) {
      const text = String(source ?? '')
      if (text.length > HIGHLIGHT_LIMIT) return text
      const lang = CODE_LANGS[ext] ?? 'js'
      const hashComment = lang === 'py' || lang === 'sh' || lang === 'yaml' || lang === 'cfg'
      const out = []
      let plain = ''
      const flush = () => {
        if (plain) {
          out.push(plain)
          plain = ''
        }
      }
      const token = (cls, value) => {
        flush()
        out.push(h('span', { key: 'tk' + out.length, className: 'dsa-tk-' + cls }, value))
      }
      let i = 0
      const n = text.length
      while (i < n) {
        const c = text[i]
        const two = text.slice(i, i + 2)
        if (c === '"' || c === "'" || c === '`') {
          let j = i + 1
          let closed = false
          while (j < n && j - i <= 4000) {
            if (text[j] === '\\') {
              j += 2
              continue
            }
            if (text[j] === c) {
              j += 1
              closed = true
              break
            }
            if (c !== '`' && text[j] === '\n') break
            j += 1
          }
          if (closed) {
            token('str', text.slice(i, j))
            i = j
            continue
          }
          plain += c
          i += 1
          continue
        }
        if (two === '/*') {
          const close = text.indexOf('*/', i + 2)
          const j = close < 0 ? n : close + 2
          token('com', text.slice(i, j))
          i = j
          continue
        }
        if (two === '//' || (hashComment && c === '#')) {
          let j = text.indexOf('\n', i)
          if (j < 0) j = n
          token('com', text.slice(i, j))
          i = j
          continue
        }
        if (c >= '0' && c <= '9' && !/[A-Za-z0-9_$]/.test(text[i - 1] ?? '')) {
          let j = i
          while (j < n && /[0-9a-fA-FxX._]/.test(text[j])) j += 1
          token('num', text.slice(i, j))
          i = j
          continue
        }
        if (/[A-Za-z_$]/.test(c)) {
          let j = i + 1
          while (j < n && /[A-Za-z0-9_$]/.test(text[j])) j += 1
          const word = text.slice(i, j)
          if (KEYWORD_SET.has(word)) token('kw', word)
          else if (text[j] === '(') token('fn', word)
          else plain += word
          i = j
          continue
        }
        plain += c
        i += 1
      }
      flush()
      return out
    }

    function renderInline(text) {
      const nodes = []
      const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/g
      let last = 0
      let match = re.exec(text)
      while (match) {
        if (match.index > last) nodes.push(text.slice(last, match.index))
        const token = match[0]
        if (token[0] === '`') {
          nodes.push(h('code', { key: 'i' + nodes.length, className: 'dsa-md-code' }, token.slice(1, -1)))
        } else if (token.startsWith('**')) {
          nodes.push(h('strong', { key: 'i' + nodes.length }, token.slice(2, -2)))
        } else if (token[0] === '*') {
          nodes.push(h('em', { key: 'i' + nodes.length }, token.slice(1, -1)))
        } else {
          const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
          nodes.push(
            h(
              'a',
              { key: 'i' + nodes.length, className: 'dsa-md-a', href: link[2], target: '_blank', rel: 'noreferrer noopener' },
              link[1],
            ),
          )
        }
        last = match.index + token.length
        match = re.exec(text)
      }
      if (last < text.length) nodes.push(text.slice(last))
      return nodes
    }

    function renderMarkdown(source) {
      const lines = String(source ?? '').split(/\r?\n/)
      const out = []
      let i = 0
      while (i < lines.length) {
        const line = lines[i]
        if (/^\s*```/.test(line)) {
          const buffer = []
          i += 1
          while (i < lines.length && !/^\s*```/.test(lines[i])) {
            buffer.push(lines[i])
            i += 1
          }
          i += 1
          out.push(h('pre', { key: 'b' + out.length, className: 'dsa-md-pre' }, buffer.join('\n')))
          continue
        }
        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading) {
          const level = Math.min(heading[1].length, 4)
          const tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
          out.push(h(tag, { key: 'b' + out.length, className: 'dsa-md-h' + level }, renderInline(heading[2])))
          i += 1
          continue
        }
        if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
          out.push(h('hr', { key: 'b' + out.length, className: 'dsa-md-hr' }))
          i += 1
          continue
        }
        if (/^>\s?/.test(line)) {
          const buffer = []
          while (i < lines.length && /^>\s?/.test(lines[i])) {
            buffer.push(lines[i].replace(/^>\s?/, ''))
            i += 1
          }
          out.push(h('blockquote', { key: 'b' + out.length, className: 'dsa-md-quote' }, renderInline(buffer.join(' '))))
          continue
        }
        const item = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line)
        if (item) {
          const items = []
          while (i < lines.length) {
            const next = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i])
            if (!next) break
            items.push(h('div', { key: 'l' + i, className: 'dsa-md-li' }, renderInline(next[2])))
            i += 1
          }
          out.push(h('div', { key: 'b' + out.length }, items))
          continue
        }
        if (!line.trim()) {
          i += 1
          continue
        }
        const buffer = []
        while (
          i < lines.length &&
          lines[i].trim() &&
          !/^\s*(#{1,6}\s|```|>|[-*+]\s|\d+[.)]\s)/.test(lines[i])
        ) {
          buffer.push(lines[i])
          i += 1
        }
        out.push(h('p', { key: 'b' + out.length, className: 'dsa-md-p' }, renderInline(buffer.join(' '))))
      }
      return h('div', { className: 'dsa-lb-md' }, out)
    }

    function parseDelimited(source) {
      const rows = []
      let row = []
      let field = ''
      let quoted = false
      const text = String(source ?? '')
      for (let i = 0; i < text.length; i += 1) {
        const c = text[i]
        if (quoted) {
          if (c === '"') {
            if (text[i + 1] === '"') {
              field += '"'
              i += 1
            } else {
              quoted = false
            }
          } else {
            field += c
          }
        } else if (c === '"') {
          quoted = true
        } else if (c === ',' || c === '\t' || c === ';') {
          row.push(field)
          field = ''
        } else if (c === '\n') {
          row.push(field)
          rows.push(row)
          row = []
          field = ''
        } else if (c !== '\r') {
          field += c
        }
        if (rows.length > TABLE_LIMIT) break
      }
      if (field.length || row.length) {
        row.push(field)
        rows.push(row)
      }
      return rows
    }

    function renderTable(rows) {
      const head = rows[0] ?? []
      const width = Math.max(1, Math.min(head.length, 40))
      return h(
        'div',
        { className: 'dsa-table-wrap' },
        h(
          'table',
          { className: 'dsa-table' },
          h(
            'thead',
            null,
            h(
              'tr',
              null,
              head.slice(0, width).map((cell, index) => h('th', { key: 'h' + index, title: cell }, cell || '—')),
            ),
          ),
          h(
            'tbody',
            null,
            rows.slice(1).map((cells, rowIndex) =>
              h(
                'tr',
                { key: 'r' + rowIndex },
                Array.from({ length: width }, (_, columnIndex) =>
                  h('td', { key: 'c' + columnIndex, title: cells[columnIndex] ?? '' }, cells[columnIndex] ?? ''),
                ),
              ),
            ),
          ),
        ),
      )
    }

    function flashNode(el) {
      if (!el || typeof el.scrollIntoView !== 'function') return 'missing'
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el.classList.add('dsa-locate-hit')
      setTimeout(() => {
        el.classList.remove('dsa-locate-hit')
      }, 1800)
      return 'found'
    }

    /**
     * Every presented file card the conversation currently has in the DOM and
     * whose title matches this artifact's path. The chat only keeps a window of
     * history mounted, so an empty result means "not rendered yet", not
     * necessarily "not in this conversation".
     */
    function findPresentedCard(item, cwd) {
      if (typeof document === 'undefined' || !item || !item.path) return null
      if (typeof document.querySelectorAll !== 'function') return null
      const norm = (value) => String(value ?? '').replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase()
      const wanted = [norm(item.path)]
      if (cwd) {
        const rel = relativeTo(item.path, cwd)
        if (rel && rel !== item.path) wanted.push(norm(rel))
      }
      const cards = Array.from(document.querySelectorAll('[data-presented-file]'))
      for (const card of cards) {
        const holder = card.hasAttribute('title') ? card : card.querySelector('[title]')
        const title = norm(holder && typeof holder.getAttribute === 'function' ? holder.getAttribute('title') : '')
        if (!title) continue
        if (wanted.some((want) => title === want || title.endsWith('/' + want) || title.endsWith(want))) {
          return holder || card
        }
      }
      return null
    }

    /** Fallback for artifacts that never had a card: find the path in plain text. */
    function findPathInText(item) {
      if (typeof NodeFilter === 'undefined' || typeof document.createTreeWalker !== 'function') return null
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      let node = walker.nextNode()
      while (node) {
        const value = node.nodeValue || ''
        if (value.indexOf(item.path) >= 0) {
          const el = node.parentElement
          if (el && !el.closest('.dsa-root')) return el
        }
        node = walker.nextNode()
      }
      return null
    }

    // The conversation keeps an early Turn's card out of the DOM until the
    // reader pulls older history in, and that control's class name is a
    // CSS-module hash that changes per build — match the stable `_older`
    // suffix first, then fall back to the localised label.
    const LOAD_EARLIER_LABELS = [
      '加载更早',
      'Load earlier',
      '以前を読み込む',
      'Charger plus tôt',
      'Früher laden',
      'Cargar antes',
      'Carregar mais cedo',
      'Загрузить раньше',
    ]
    const LOAD_EARLIER_ROUNDS = 12
    const LOAD_EARLIER_WAIT = 900

    function findLoadEarlierButton() {
      if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return null
      const scoped = document.querySelectorAll('div[class*="_older"] > button')
      for (const node of scoped) if (node && node.disabled !== true) return node
      const buttons = document.querySelectorAll('button')
      for (const node of buttons) {
        if (!node || node.disabled === true) continue
        const label = String(node.textContent ?? '').trim()
        if (LOAD_EARLIER_LABELS.indexOf(label) >= 0) return node
      }
      return null
    }

    function hasLoadEarlierButton() {
      return findLoadEarlierButton() !== null
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }

    async function waitForPresentedCard(item, cwd, timeoutMs) {
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        const card = findPresentedCard(item, cwd)
        if (card) return card
        await sleep(120)
      }
      return findPresentedCard(item, cwd)
    }

    /**
     * The conversation exposes no "scroll to the turn that produced this file"
     * API, so we reuse what the deliverables UI already put in the DOM: every
     * presented file card carries `[data-presented-file]` and a title holding
     * the workspace-relative path. When the card belongs to a Turn that has not
     * been pulled into the DOM yet, click "load earlier" and look again before
     * giving up.
     */
    async function locateInConversation(item, cwd) {
      if (typeof document === 'undefined' || !item || !item.path) return 'missing'
      const direct = findPresentedCard(item, cwd)
      if (direct) return flashNode(direct)
      for (let round = 0; round < LOAD_EARLIER_ROUNDS; round += 1) {
        const button = findLoadEarlierButton()
        if (!button) break
        button.click()
        const card = await waitForPresentedCard(item, cwd, LOAD_EARLIER_WAIT)
        if (card) return flashNode(card)
      }
      const text = findPathInText(item)
      if (text) return flashNode(text)
      return 'missing'
    }

    // ---------------------------------------------------------------------
    // Transport
    // ---------------------------------------------------------------------
    async function requestJson(url, init) {
      const response = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
        ...(init ?? {}),
      })
      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      if (!response.ok || (payload && payload.ok === false)) {
        const message = payload?.error ?? `HTTP ${response.status}`
        throw new Error(message)
      }
      return payload
    }

    const loadSessions = (includeDerived) =>
      requestJson(`${API}/sessions${includeDerived ? '?includeDerived=1' : ''}`).then((p) => ({
        sessions: p.sessions ?? [],
        derived: p.derived ?? 0,
        total: p.total ?? 0,
      }))
    const loadArtifacts = (sessionId) => requestJson(`${API}/artifacts?sessionId=${encodeURIComponent(sessionId)}`)
    const loadTrash = () => requestJson(`${API}/trash`).then((p) => p.entries ?? [])

    const moveToTrash = (paths, context) =>
      requestJson(`${API}/trash`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paths, sessionId: context?.sessionId ?? null, cwd: context?.cwd ?? null }),
      })

    const dismissPaths = (sessionId, paths) =>
      requestJson(`${API}/dismiss`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, paths }),
      })

    const restoreEntry = (id) =>
      requestJson(`${API}/restore`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      })

    const purgeEntry = (id) =>
      requestJson(`${API}/purge`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      })

    async function loadText(path) {
      const response = await fetch(rawUrl(path, 'text'), { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.text()
    }

    // ---------------------------------------------------------------------
    // Icons (inline SVG so no icon package is required)
    // ---------------------------------------------------------------------
    function svg(size, children) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.35,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          style: { flex: 'none', opacity: 0.82 },
        },
        children,
      )
    }

    const IconFile = (size) =>
      svg(size ?? 14, [
        h('path', { key: 'a', d: 'M9 1.8H4.6a1 1 0 0 0-1 1v10.4a1 1 0 0 0 1 1h6.8a1 1 0 0 0 1-1V5.2z' }),
        h('path', { key: 'b', d: 'M9 1.8v3.4h3.4' }),
      ])
    const IconImage = (size) =>
      svg(size ?? 14, [
        h('rect', { key: 'a', x: 1.9, y: 2.8, width: 12.2, height: 10.4, rx: 1.2 }),
        h('circle', { key: 'b', cx: 5.4, cy: 6.1, r: 1.1 }),
        h('path', { key: 'c', d: 'M2.4 12.1 6.3 8.6l2.5 2.2 2-1.8 2.9 3.1' }),
      ])
    const IconVideo = (size) =>
      svg(size ?? 14, [
        h('rect', { key: 'a', x: 1.9, y: 3.4, width: 8.4, height: 9.2, rx: 1.2 }),
        h('path', { key: 'b', d: 'M10.3 7.4l3.3-2.2v5.6l-3.3-2.2z' }),
      ])
    const IconModel = (size) =>
      svg(size ?? 14, [
        h('path', { key: 'a', d: 'M8 1.9l5.3 3.1v6L8 14.1l-5.3-3.1v-6z' }),
        h('path', { key: 'b', d: 'M8 8.1v6M8 8.1 2.7 5M8 8.1 13.3 5' }),
      ])
    const IconCode = (size) =>
      svg(size ?? 14, [h('path', { key: 'a', d: 'M5.6 4.4 2.4 8l3.2 3.6' }), h('path', { key: 'b', d: 'M10.4 4.4 13.6 8l-3.2 3.6' })])
    const IconDoc = (size) =>
      svg(size ?? 14, [
        h('path', { key: 'a', d: 'M4 1.9h5.4L13 5.5v8.6H4z' }),
        h('path', { key: 'b', d: 'M9.4 1.9v3.6H13' }),
        h('path', { key: 'c', d: 'M6 9h4M6 11h3' }),
      ])
    const IconArchive = (size) =>
      svg(size ?? 14, [h('rect', { key: 'a', x: 2.2, y: 4.2, width: 11.6, height: 3, rx: .8 }), h('path', { key: 'b', d: 'M3.2 7.2v6.4h9.6V7.2' }), h('path', { key: 'c', d: 'M8 2v2.2' })])
    const IconRefresh = (size) =>
      svg(size ?? 14, [h('path', { key: 'a', d: 'M13.2 8a5.2 5.2 0 1 1-1.6-3.7' }), h('path', { key: 'b', d: 'M13.4 2.4v3.2h-3.2' })])
    const IconTrash = (size) =>
      svg(size ?? 14, [
        h('path', { key: 'a', d: 'M2.8 4.4h10.4' }),
        h('path', { key: 'b', d: 'M6.2 4.4V3a.8.8 0 0 1 .8-.8h2a.8.8 0 0 1 .8.8v1.4' }),
        h('path', { key: 'c', d: 'M4.2 4.4l.6 8.4a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9l.6-8.4' }),
      ])
    const IconChevron = (size, open) =>
      svg(size ?? 12, [h('path', { key: 'a', d: open ? 'M4 6.2 8 10l4-3.8' : 'M6.2 4 10 8l-3.8 4' })])
    const IconBack = (size) => svg(size ?? 14, [h('path', { key: 'a', d: 'M10 3.2 5.2 8 10 12.8' })])
    const IconCopy = (size) =>
      svg(size ?? 13, [
        h('rect', { key: 'a', x: 5.4, y: 5.4, width: 8, height: 8, rx: 1.1 }),
        h('path', { key: 'b', d: 'M10.6 5.4V3.7a1 1 0 0 0-1-1H3.7a1 1 0 0 0-1 1v5.9a1 1 0 0 0 1 1h1.7' }),
      ])
    const IconExternal = (size) =>
      svg(size ?? 13, [h('path', { key: 'a', d: 'M9.6 2.6h3.8v3.8' }), h('path', { key: 'b', d: 'M13.4 2.6 7.6 8.4' }), h('path', { key: 'c', d: 'M11.8 9.4v3a1 1 0 0 1-1 1H3.6a1 1 0 0 1-1-1V5.2a1 1 0 0 1 1-1h3' })])
    const IconClose = (size) =>
      svg(size ?? 14, [h('path', { key: 'a', d: 'M4 4l8 8' }), h('path', { key: 'b', d: 'M12 4l-8 8' })])
    const IconForward = (size) => svg(size ?? 14, [h('path', { key: 'a', d: 'M6 3.2 10.8 8 6 12.8' })])

    const KIND_ICON = {
      image: IconImage,
      video: IconVideo,
      audio: IconVideo,
      model: IconModel,
      vector: IconModel,
      doc: IconDoc,
      pdf: IconDoc,
      office: IconDoc,
      code: IconCode,
      archive: IconArchive,
      other: IconFile,
    }

    function kindIcon(kind, size) {
      return (KIND_ICON[kind] ?? IconFile)(size)
    }

    // ---------------------------------------------------------------------
    // Components
    // ---------------------------------------------------------------------
    function IconButton(props) {
      return h(
        'button',
        {
          className: 'dsa-icon-btn' + (props.active ? ' on' : ''),
          type: 'button',
          title: props.title,
          disabled: props.disabled,
          onClick: props.onClick,
        },
        props.children,
      )
    }

    function Thumb(props) {
      const { item } = props
      const kind = kindOf(item.path)
      const brokenRef = React.useRef(false)
      const [, force] = React.useState(0)
      const showImage = isRasterImage(item.path) && item.exists !== false && item.size > 0 && item.size < 8 * 1024 * 1024 && !brokenRef.current
      if (showImage) {
        return h('img', {
          className: 'dsa-thumb',
          src: rawUrl(item.path),
          alt: '',
          loading: 'lazy',
          draggable: false,
          onError: () => {
            brokenRef.current = true
            force((n) => n + 1)
          },
        })
      }
      return h('div', { className: 'dsa-thumb', style: { opacity: item.exists === false ? 0.45 : 1 } }, kindIcon(kind, 15))
    }

    function ArtifactRow(props) {
      const { item, cwd, onPreview, onTrash, onCopy, onLocate, busy } = props
      const name = baseName(item.path)
      const rel = relativeTo(item.path, cwd)
      const shownDir = rel === item.path ? dirName(item.path) : rel
      const missing = item.exists === false
      const ext = extName(item.path)
      const parts = [fmtBytes(item.size)]
      if (item.turns && item.turns.length > 1) parts.push(`交付 ${item.turns.length} 次`)
      else if (item.turn != null) parts.push(`第 ${item.turn} 轮`)
      if (item.tools && item.tools.length) parts.push(item.tools.slice(0, 2).join(' · '))
      return h(
        'div',
        {
          className: 'dsa-row',
          title: item.path,
          onClick: () => {
            if (!missing) onPreview?.(item)
          },
        },
        h(Thumb, { item }),
        h(
          'div',
          { className: 'dsa-row-body' },
          h(
            'div',
            { className: 'dsa-row-top' },
            h('span', { className: 'dsa-name' + (missing ? ' gone' : '') }, name),
            ext ? h('span', { className: 'dsa-ext' }, ext) : null,
          ),
          h(
            'div',
            { className: 'dsa-meta' },
            missing
              ? h('span', { style: { color: '#e5484d' } }, '文件已不在磁盘上')
              : parts.map((text, index) => h('span', { key: 'm' + index }, (index ? '· ' : '') + text)),
            h('span', { className: 'dsa-dir', title: shownDir }, '· ' + shownDir),
          ),
          item.description ? h('div', { className: 'dsa-desc', title: item.description }, item.description) : null,
        ),
        h(
          'span',
          { className: 'dsa-actions', onClick: (event) => event.stopPropagation() },
          onLocate
            ? h(
                'button',
                {
                  className: 'dsa-mini',
                  type: 'button',
                  title: item.exists === false ? '文件已不在磁盘，仍可尝试定位' : '在对话里滚到产出这条文件的那一轮',
                  onClick: () => onLocate(item),
                },
                '定位',
              )
            : null,
          h('button', { className: 'dsa-mini', type: 'button', title: '复制完整路径', onClick: () => onCopy(item.path) }, '复制'),
          h(
            'button',
            {
              className: 'dsa-mini' + (missing ? '' : ' danger'),
              type: 'button',
              disabled: busy,
              title: missing ? '文件已不在磁盘，从列表中移除这条记录' : '移到回收站（可恢复）',
              onClick: () => onTrash(item.path),
            },
            busy ? '…' : missing ? '移除' : '删除',
          ),
        ),
      )
    }

    function GroupHeader(props) {
      const { label, count, open, onToggle, tone } = props
      return h(
        'div',
        { className: 'dsa-group', onClick: onToggle },
        IconChevron(12, open),
        h('span', { className: 'dsa-group-dot ' + tone }),
        h('span', null, label),
        h('span', { className: 'dsa-count' }, count),
      )
    }

    function SessionPicker(props) {
      const { sessions, current, onPick, onClose, showDerived, derivedCount, onToggleDerived } = props
      return h(
        'div',
        { className: 'dsa-picker' },
        h(
          'div',
          { className: 'dsa-picker-head' },
          h('span', { style: { flex: 1, fontWeight: 650, opacity: 0.82 } }, `历史会话 (${sessions.length})`),
          h('button', { className: 'dsa-mini', type: 'button', onClick: onClose }, '收起'),
        ),
        sessions.map((s) =>
          h(
            'div',
            {
              key: s.sessionId,
              className: 'dsa-picker-row' + (s.sessionId === current ? ' current' : ''),
              title: `${s.title || s.sessionId}\n${s.cwd ?? ''}\n${fmtTime(s.createdAt)}${s.derived ? '\n派生会话（继承了父会话的历史）' : ''}`,
              onClick: () => onPick(s.sessionId),
            },
            IconFile(12),
            h('span', { className: 'dsa-picker-title' }, s.title || s.sessionId.slice(0, 18)),
            s.derived ? h('span', { className: 'dsa-derived-tag' }, '派生') : null,
            h('span', { className: 'dsa-picker-meta' }, `${s.turnCount} 轮 · ${fmtBytes(s.size)}`),
          ),
        ),
        derivedCount > 0 || showDerived
          ? h(
              'button',
              { className: 'dsa-picker-foot', type: 'button', onClick: onToggleDerived },
              showDerived ? '隐藏派生会话' : `另有 ${derivedCount} 个派生会话（继承父会话历史的子会话）`,
            )
          : null,
      )
    }

    function TrashPanel(props) {
      const { entries, onRestore, onPurge, onRefresh } = props
      return h(
        'div',
        { className: 'dsa-trash' },
        h(
          'div',
          { className: 'dsa-group', onClick: onRefresh, style: { paddingTop: 4 } },
          IconTrash(13),
          h('span', null, '回收站'),
          h('span', { className: 'dsa-count' }, entries.length),
          h('span', { style: { flex: 1 } }),
          h('span', { style: { fontSize: 10.5, opacity: 0.5, fontWeight: 400 } }, '点击刷新'),
        ),
        entries.length === 0
          ? h('div', { className: 'dsa-empty', style: { padding: '12px 6px' } }, '回收站是空的')
          : entries.map((entry) =>
              h(
                'div',
                { key: entry.id, className: 'dsa-row', style: { cursor: 'default' } },
                h(
                  'div',
                  { className: 'dsa-row-body' },
                  h('div', { className: 'dsa-row-top' }, h('span', { className: 'dsa-name' }, baseName(entry.originalPath))),
                  h(
                    'div',
                    { className: 'dsa-meta' },
                    h('span', null, `${fmtTime(entry.trashedAt)} · ${fmtBytes(entry.size)}`),
                    entry.originalExists ? h('span', { style: { color: '#e5484d' } }, '· 原位置已占用') : null,
                    h('span', { className: 'dsa-dir', title: entry.originalPath }, '· ' + dirName(entry.originalPath)),
                  ),
                ),
                h(
                  'span',
                  { className: 'dsa-actions', style: { opacity: 1 } },
                  h(
                    'button',
                    {
                      className: 'dsa-mini',
                      type: 'button',
                      disabled: !entry.exists || entry.originalExists,
                      title: entry.originalExists ? '原位置已被占用，无法恢复' : '恢复到原位置',
                      onClick: () => onRestore(entry.id),
                    },
                    '恢复',
                  ),
                  h(
                    'button',
                    { className: 'dsa-mini danger', type: 'button', title: '永久删除', onClick: () => onPurge(entry.id) },
                    '彻底删除',
                  ),
                ),
              ),
            ),
      )
    }

    /**
     * Quick look: fills the tab body in place (absolutely positioned over the
     * list), so the file is readable inside the sidebar without covering the
     * chat. Esc / the close button / a click on the empty area dismisses it;
     * ← and → walk the session's file list.
     */
    function QuickLook(props) {
      const { item, items, onClose, onSelect, onCopy, onOpenInEditor } = props
      const kind = kindOf(item.path)
      const [text, setText] = React.useState(null)
      const [note, setNote] = React.useState(null)
      const [loadingText, setLoadingText] = React.useState(false)

      const wantText = kind === 'doc' || kind === 'code' || extName(item.path) === 'svg'
      const list = Array.isArray(items) ? items : []
      const index = list.findIndex((it) => it.path === item.path)
      const prev = index > 0 ? list[index - 1] : null
      const next = index >= 0 && index < list.length - 1 ? list[index + 1] : null

      React.useEffect(() => {
        setText(null)
        setNote(null)
        setLoadingText(false)
      }, [item.path])

      React.useEffect(() => {
        if (!wantText) return
        let alive = true
        setLoadingText(true)
        setNote(null)
        loadText(item.path)
          .then((value) => {
            if (alive) setText(value)
          })
          .catch((error) => {
            if (alive) setNote(String(error?.message ?? error))
          })
          .finally(() => {
            if (alive) setLoadingText(false)
          })
        return () => {
          alive = false
        }
      }, [item.path, wantText])

      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose?.()
          } else if (event.key === 'ArrowLeft' && prev) {
            onSelect?.(prev)
          } else if (event.key === 'ArrowRight' && next) {
            onSelect?.(next)
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [prev, next, onClose, onSelect])

      const ext = extName(item.path)
      let body = null
      if (kind === 'image') {
        body = h('img', { className: 'dsa-lb-img', src: rawUrl(item.path), alt: baseName(item.path) })
      } else if (kind === 'video') {
        body = h('video', { className: 'dsa-lb-video', src: rawUrl(item.path), controls: true })
      } else if (kind === 'audio') {
        body = h('audio', { className: 'dsa-lb-audio', src: rawUrl(item.path), controls: true })
      } else if (kind === 'pdf') {
        // Streamed byte-for-byte: no text decode, no truncation. The raw route
        // refuses anything above 48 MB, so say that up front instead of letting
        // the frame render a JSON error body.
        body =
          (item.size ?? 0) > 48 * 1024 * 1024
            ? h(
                'div',
                { className: 'dsa-lb-note' },
                '这个 PDF 超过 48 MB，插件不做内嵌预览。',
                h('br'),
                '用上面的「在编辑器中打开」，或拖到别的应用里看。',
              )
            : h('iframe', { className: 'dsa-lb-pdf', src: rawUrl(item.path), title: baseName(item.path) })
      } else if (kind === 'office') {
        body = h(
          'div',
          { className: 'dsa-lb-note' },
          (ext || 'Office').toUpperCase(),
          ' 是打包格式，浏览器没有内置渲染器，所以这里不预览内容。',
          h('br'),
          '用上面的「在编辑器中打开」，或先另存成 PDF / 图片。',
        )
      } else if (wantText) {
        if (note) body = h('div', { className: 'dsa-lb-note' }, '读不出来：', note)
        else if (loadingText && text === null) body = h('div', { className: 'dsa-lb-note' }, '正在读取…')
        else if (ext === 'md') body = renderMarkdown(text ?? '')
        else if (ext === 'csv' || ext === 'tsv') body = renderTable(parseDelimited(text ?? ''))
        else if (kind === 'code') body = h('pre', { className: 'dsa-lb-text' }, highlightSource(text ?? '', ext))
        else body = h('pre', { className: 'dsa-lb-text' }, text ?? '')
      } else {
        body = h(
          'div',
          { className: 'dsa-lb-note' },
          '这类文件没有窗口预览（',
          ext || '未知格式',
          '）。',
          h('br'),
          '可以复制路径，或用编辑器打开。',
        )
      }

      const dismiss = (event) => {
        if (event.target === event.currentTarget) onClose?.()
      }

      const node = h(
        'div',
        { className: 'dsa-lb', onClick: dismiss },
        h(
          'div',
          { className: 'dsa-lb-head', onClick: (event) => event.stopPropagation() },
          h(
            'div',
            { className: 'dsa-lb-name', title: item.path },
            (KIND_ICON[kind] ?? IconFile)(14),
            h('span', null, baseName(item.path)),
          ),
          onOpenInEditor
            ? h('button', { className: 'dsa-lb-btn', type: 'button', title: '在编辑器中打开', onClick: () => onOpenInEditor(item.path) }, IconExternal(14))
            : null,
          h('button', { className: 'dsa-lb-btn', type: 'button', title: '复制完整路径', onClick: () => onCopy(item.path) }, IconCopy(14)),
          h('button', { className: 'dsa-lb-btn', type: 'button', title: '关闭（Esc）', onClick: onClose }, IconClose(15)),
        ),
        h('div', { className: 'dsa-lb-body', onClick: dismiss }, body),
        h(
          'div',
          { className: 'dsa-lb-foot', onClick: (event) => event.stopPropagation() },
          h(
            'button',
            { className: 'dsa-lb-btn', type: 'button', title: '上一个（←）', disabled: !prev, onClick: () => prev && onSelect?.(prev) },
            IconBack(14),
          ),
          h(
            'button',
            { className: 'dsa-lb-btn', type: 'button', title: '下一个（→）', disabled: !next, onClick: () => next && onSelect?.(next) },
            IconForward(14),
          ),
          index >= 0 ? h('span', { className: 'dsa-lb-count' }, `${index + 1} / ${list.length}`) : null,
          h('span', { className: 'dsa-path', title: item.path }, item.path),
          h('span', { style: { flex: 'none' } }, fmtBytes(item.size)),
        ),
      )

      return node
    }

    function SessionArtifactsView(props) {
      ensureStyle()
      const scope = props.scope ?? {}
      const currentId = scope.sessionId
      const visible = props.visible !== false
      const onOpenFile = props.onOpenFile

      const [sessions, setSessions] = React.useState([])
      const [derivedCount, setDerivedCount] = React.useState(0)
      const [showDerived, setShowDerived] = React.useState(false)
      const [selected, setSelected] = React.useState(currentId)
      const [manual, setManual] = React.useState(false)
      const [data, setData] = React.useState(null)
      const [loading, setLoading] = React.useState(false)
      const [error, setError] = React.useState(null)
      const [pickerOpen, setPickerOpen] = React.useState(false)
      const [showDeliverables, setShowDeliverables] = React.useState(true)
      const [showProduced, setShowProduced] = React.useState(true)
      const [trashOpen, setTrashOpen] = React.useState(false)
      const [trash, setTrash] = React.useState([])
      const [busyPath, setBusyPath] = React.useState(null)
      const [toast, setToast] = React.useState(null)
      const [preview, setPreview] = React.useState(null)
      const toastTimer = React.useRef(null)

      const flash = React.useCallback((message) => {
        setToast(message)
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(null), 2200)
      }, [])

      const refresh = React.useCallback(async () => {
        if (!selected) return
        setLoading(true)
        setError(null)
        try {
          const payload = await loadArtifacts(selected)
          setData(payload)
        } catch (err) {
          setError(String(err?.message ?? err))
        } finally {
          setLoading(false)
        }
      }, [selected])

      const refreshTrash = React.useCallback(async () => {
        try {
          setTrash(await loadTrash())
        } catch (err) {
          setError(String(err?.message ?? err))
        }
      }, [])

      // Follow the active conversation unless the user pinned another one.
      React.useEffect(() => {
        if (!manual && currentId) setSelected(currentId)
      }, [currentId, manual])

      React.useEffect(() => {
        refresh()
      }, [refresh, visible])

      React.useEffect(() => {
        let alive = true
        loadSessions(showDerived)
          .then((payload) => {
            if (!alive) return
            setSessions(payload.sessions)
            setDerivedCount(payload.derived)
          })
          .catch(() => {})
        return () => {
          alive = false
        }
      }, [visible, showDerived])

      React.useEffect(() => {
        if (trashOpen) refreshTrash()
      }, [trashOpen, refreshTrash])

      React.useEffect(
        () => () => {
          if (toastTimer.current) clearTimeout(toastTimer.current)
        },
        [],
      )

      // A stale preview (trashed, or switched conversation) closes itself.
      React.useEffect(() => {
        setPreview(null)
      }, [selected])

      const copyPath = React.useCallback(
        (target) => {
          const done = () => flash('已复制路径')
          try {
            if (navigator?.clipboard?.writeText) {
              navigator.clipboard.writeText(target).then(done, () => flash('复制失败'))
              return
            }
          } catch {
            /* fall through */
          }
          flash('剪贴板不可用')
        },
        [flash],
      )

      const locateOne = React.useCallback(
        async (item) => {
          // A card from an early Turn is only in the DOM after the conversation
          // pulls older history in, which takes a moment. Say so instead of
          // looking frozen, then report what actually happened.
          if (hasLoadEarlierButton()) flash('正在往更早的对话里找…')
          const result = await locateInConversation(item, data?.cwd ?? null)
          flash(result === 'found' ? '已在对话里定位' : '对话里没找到这条产物的卡片；先让对话加载更早的轮次再试')
        },
        [data, flash],
      )

      const trashOne = React.useCallback(
        async (target) => {
          const known = [...(data?.deliverables ?? []), ...(data?.produced ?? [])].find((it) => it.path === target)
          const confirmWith = (message) => {
            if (typeof window === 'undefined' || typeof window.confirm !== 'function') return true
            return window.confirm(message)
          }

          // Already gone: there is nothing to trash and nothing to restore, so the
          // only useful action is to stop listing it.
          if (known?.exists === false) {
            if (!confirmWith('这个文件已经不在磁盘上了\n\n' + target + '\n\n只能把它从列表里移除，文件本身找不回来。')) return
            setBusyPath(target)
            setError(null)
            try {
              await dismissPaths(selected, [target])
              flash('已从列表移除')
              if (preview?.path === target) setPreview(null)
              await refresh()
            } catch (err) {
              setError(String(err?.message ?? err))
            } finally {
              setBusyPath(null)
            }
            return
          }

          if (!confirmWith('移到回收站？\n\n' + target + '\n\n之后可以在「回收站」里恢复。')) return
          setBusyPath(target)
          setError(null)
          try {
            const payload = await moveToTrash([target], { sessionId: selected, cwd: data?.cwd })
            const results = payload.results ?? []
            // Race: the file can disappear between the list load and this click.
            const vanished = results.filter((r) => r.ok === false && r.missing).map((r) => r.path)
            const failed = results.filter((r) => r.ok === false && !r.missing)
            if (vanished.length > 0) {
              try {
                await dismissPaths(selected, vanished)
              } catch {
                /* the refresh below still reflects the truth */
              }
              flash('文件已不在磁盘，已从列表移除')
              if (vanished.includes(target) && preview?.path === target) setPreview(null)
              await refresh()
              if (trashOpen) await refreshTrash()
              return
            }
            if (failed.length > 0) throw new Error(failed[0].error ?? '删除失败')
            flash('已移入回收站')
            if (preview?.path === target) setPreview(null)
            await refresh()
            if (trashOpen) await refreshTrash()
          } catch (err) {
            setError(String(err?.message ?? err))
          } finally {
            setBusyPath(null)
          }
        },
        [selected, data, flash, refresh, refreshTrash, trashOpen, preview],
      )

      // One click to clear every record whose file is already gone. Each of those
      // rows is a dead entry (the file cannot be restored), so the batch is just
      // many calls of the same "stop listing this" decision.
      const dismissAllMissing = React.useCallback(async () => {
        const gone = [
          ...new Set(
            [...(data?.deliverables ?? []), ...(data?.produced ?? [])]
              .filter((it) => it.exists === false)
              .map((it) => it.path),
          ),
        ]
        if (gone.length === 0) return
        if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
          if (!window.confirm(`从列表里移除 ${gone.length} 条已不在磁盘上的记录？\n\n文件本身早就没了，这一步只清列表。`)) return
        }
        setError(null)
        try {
          await dismissPaths(selected, gone)
          flash(`已移除 ${gone.length} 条记录`)
          setPreview(null)
          await refresh()
        } catch (err) {
          setError(String(err?.message ?? err))
        }
      }, [data, selected, flash, refresh])

      const openSession = (id) => {
        setManual(id !== currentId)
        setSelected(id)
        setPickerOpen(false)
      }

      const deliverables = data?.deliverables ?? []
      const produced = data?.produced ?? []
      const cwd = data?.cwd ?? null
      const counts = data?.counts ?? { deliverables: 0, produced: 0, bytes: 0, missing: 0 }

      const activeTitle =
        sessions.find((s) => s.sessionId === selected)?.title || data?.title || (selected ? selected.slice(0, 18) : '（未选择会话）')

      const summary = h(
        'div',
        { className: 'dsa-summary' },
        h('span', { className: 'dsa-pill' }, h('b', null, counts.deliverables), ' 交付物'),
        h('span', { className: 'dsa-pill' }, h('b', null, counts.produced), ' 过程产物'),
        counts.bytes ? h('span', { className: 'dsa-pill' }, fmtBytes(counts.bytes)) : null,
        counts.missing
          ? h(
              'button',
              {
                className: 'dsa-pill warn btn',
                type: 'button',
                title: '从列表里移除所有已不在磁盘上的记录',
                onClick: dismissAllMissing,
              },
              `${counts.missing} 个已丢失 · 清除`,
            )
          : null,
      )

      // One flat, de-duplicated order for the lightbox's ← / → walk.
      const quickLookItems = React.useMemo(() => {
        const seen = new Set()
        const out = []
        for (const item of [...(deliverables ?? []), ...(produced ?? [])]) {
          if (item && item.path && !seen.has(item.path)) {
            seen.add(item.path)
            out.push(item)
          }
        }
        return out
      }, [deliverables, produced])

      return h(
        'div',
        { className: 'dsa-root' },
        h(
          'div',
          { className: 'dsa-bar' },
          h(
            'div',
            { className: 'dsa-title', title: selected ?? '', onClick: () => setPickerOpen((open) => !open) },
            IconChevron(11, !pickerOpen),
            h('span', { className: 'dsa-title-text' }, activeTitle),
          ),
          h(IconButton, { title: '刷新', onClick: refresh, disabled: loading }, IconRefresh(14)),
          h(
            IconButton,
            { title: '回收站', active: trashOpen, onClick: () => setTrashOpen((open) => !open) },
            IconTrash(14),
          ),
        ),
        pickerOpen
          ? h(SessionPicker, {
              sessions,
              current: selected,
              onPick: openSession,
              onClose: () => setPickerOpen(false),
              showDerived,
              derivedCount,
              onToggleDerived: () => setShowDerived((v) => !v),
            })
          : null,
        error
          ? h(
              'div',
              { className: 'dsa-err' },
              error,
              h(
                'div',
                { style: { marginTop: 4 } },
                h('button', { className: 'dsa-mini', type: 'button', onClick: () => setError(null) }, '关闭'),
              ),
            )
          : null,
        summary,
        h(
          'div',
          { className: 'dsa-body' },
          loading && !data ? h('div', { className: 'dsa-empty' }, '正在读取会话记录…') : null,
          !loading && data && deliverables.length === 0 && produced.length === 0
            ? h(
                'div',
                { className: 'dsa-empty' },
                '这个会话还没有产出文件。',
                h('br'),
                '我用写文件类工具（write / edit / blender_* / godot_* 等）生成的文件会出现在这里。',
              )
            : null,
          deliverables.length > 0
            ? h(
                'div',
                null,
                h(GroupHeader, {
                  label: '交付物',
                  count: deliverables.length,
                  open: showDeliverables,
                  onToggle: () => setShowDeliverables((open) => !open),
                  tone: 'deliver',
                }),
                showDeliverables
                  ? deliverables.map((item) =>
                      h(ArtifactRow, {
                        key: 'd:' + item.path,
                        item,
                        cwd,
                        busy: busyPath === item.path,
                        onPreview: setPreview,
                        onTrash: trashOne,
                        onCopy: copyPath,
                        onLocate: locateOne,
                      }),
                    )
                  : null,
              )
            : null,
          produced.length > 0
            ? h(
                'div',
                null,
                h(GroupHeader, {
                  label: '过程产物',
                  count: produced.length,
                  open: showProduced,
                  onToggle: () => setShowProduced((open) => !open),
                  tone: 'produced',
                }),
                showProduced
                  ? produced.map((item) =>
                      h(ArtifactRow, {
                        key: 'p:' + item.path,
                        item,
                        cwd,
                        busy: busyPath === item.path,
                        onPreview: setPreview,
                        onTrash: trashOne,
                        onCopy: copyPath,
                        onLocate: locateOne,
                      }),
                    )
                  : null,
              )
            : null,
        ),
        trashOpen
          ? h(TrashPanel, {
              entries: trash,
              onRefresh: refreshTrash,
              onRestore: async (id) => {
                try {
                  await restoreEntry(id)
                  flash('已恢复')
                  await refreshTrash()
                  await refresh()
                } catch (err) {
                  setError(String(err?.message ?? err))
                }
              },
              onPurge: async (id) => {
                if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                  if (!window.confirm('彻底删除？此操作不可恢复。')) return
                }
                try {
                  await purgeEntry(id)
                  flash('已彻底删除')
                  await refreshTrash()
                } catch (err) {
                  setError(String(err?.message ?? err))
                }
              },
            })
          : null,
        preview
          ? h(QuickLook, {
              item: preview,
              items: quickLookItems,
              onClose: () => setPreview(null),
              onSelect: setPreview,
              onCopy: copyPath,
              onOpenInEditor: onOpenFile,
            })
          : null,
        toast ? h('div', { className: 'dsa-toast' }, toast) : null,
      )
    }

    // ---------------------------------------------------------------------
    // Registration
    // ---------------------------------------------------------------------
    /**
     * The sidebar hosts third-party tabs next to its own; a throw inside this
     * view must not take the sidebar down with it, so the tab body is wrapped in
     * an error boundary that degrades to a one-line message.
     */
    const SafeBoundary = (() => {
      if (!React || typeof React.Component !== 'function') return null
      return class SafeBoundary extends React.Component {
        constructor(props) {
          super(props)
          this.state = { error: null }
        }
        static getDerivedStateFromError(error) {
          return { error }
        }
        componentDidCatch(error) {
          if (typeof console !== 'undefined') console.error('[session-artifacts]', error)
        }
        render() {
          if (this.state.error) {
            return h(
              'div',
              { className: 'dsa-empty' },
              '这个面板渲染出错了：',
              h('br'),
              String(this.state.error?.message ?? this.state.error),
            )
          }
          return this.props.children
        }
      }
    })()

    exports.inject = ['betterSidebar']

    // Test seam for test/probe-client.mjs. These are pure functions — no DOM
    // mutation, no network — so exposing them cannot change runtime behaviour.
    exports.__test = {
      kindOf,
      highlightSource,
      renderMarkdown,
      parseDelimited,
      locateInConversation,
      findPresentedCard,
      findLoadEarlierButton,
    }

    exports.apply = function apply(ctx) {
      // `ctx.effect` ties the registration to this plugin's fiber, so a reload
      // or disable removes the tab instead of leaving a dangling descriptor.
      const register = () =>
        ctx.betterSidebar.registerTab({
          id: 'session-artifacts',
          title: () => '本会话产物',
          description: '本会话产出的文件清单：交付物 + 过程产物，可预览、复制路径、移入回收站',
          icon: (size) => IconFile(size ?? 16),
          order: 55,
          single: true,
          component: (componentProps) => {
            const view = h(SessionArtifactsView, componentProps)
            return SafeBoundary ? h(SafeBoundary, null, view) : view
          },
        })

      if (typeof ctx.effect === 'function') ctx.effect(register)
      else register()
    }

    return module.exports
  },
})
