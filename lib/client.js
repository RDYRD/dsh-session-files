window.__ModuleLoader__.load({
  id: 'dsh-session-artifacts',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const API = '/api/dsh-session-artifacts'

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
    registerKind('doc', ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'md', 'txt', 'csv', 'html', 'htm', 'rtf'])
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
      const { item, cwd, onPreview, onTrash, onCopy, busy } = props
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

      let body = null
      if (kind === 'image') {
        body = h('img', { className: 'dsa-lb-img', src: rawUrl(item.path), alt: baseName(item.path) })
      } else if (kind === 'video') {
        body = h('video', { className: 'dsa-lb-video', src: rawUrl(item.path), controls: true })
      } else if (kind === 'audio') {
        body = h('audio', { className: 'dsa-lb-audio', src: rawUrl(item.path), controls: true })
      } else if (wantText) {
        if (note) body = h('div', { className: 'dsa-lb-note' }, '读不出来：', note)
        else if (loadingText && text === null) body = h('div', { className: 'dsa-lb-note' }, '正在读取…')
        else body = h('pre', { className: 'dsa-lb-text' }, text ?? '')
      } else {
        body = h(
          'div',
          { className: 'dsa-lb-note' },
          '这类文件没有窗口预览（',
          extName(item.path) || '未知格式',
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
