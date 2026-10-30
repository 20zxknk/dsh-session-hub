/**
 * Session Hub — a main-panel list of every Session across every Workspace.
 *
 * The shipped sidebar browses Workspaces first; with many Workspaces and many
 * Sessions that makes a particular Session hard to find. This panel reads the
 * same framework-neutral snapshots the sidebar reads (`sessions.list` and
 * `workspaces.list`) and offers one list that can be ordered by day, recency,
 * Workspace, or title, plus a sidebar entry that opens it. It shadows nothing:
 * `main` is a keyed slot and `sidebar.panellist` is a list slot.
 *
 * Identification is the point of the design: a day header anchors "when", a
 * left clock column gives the time within that day, a per-Workspace colour bar
 * gives "where", and the turn count gives "how far it went".
 */
window.__ModuleLoader__.load({
  id: '@local/session-hub',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'sessionhub'
    const PANEL_ID = 'session-hub'
    const STORE_KEY = 'dsh.session-hub.view'
    const PAGE_LIMIT = 200
    const EMPTY_STATUS = new Map()
    const SORTS = ['time', 'recent', 'workspace', 'title']

    /* ── style ─────────────────────────────────────────────────────────── */

    const CSS = `
.dsh-sh-page{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}
.dsh-sh-head{flex:none;display:flex;flex-direction:column;gap:12px;padding:22px clamp(16px,3vw,40px) 10px}
.dsh-sh-titleRow{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between}
.dsh-sh-h1{display:flex;align-items:baseline;gap:10px;margin:0;font-size:20px;font-weight:500;line-height:28px}
.dsh-sh-count{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:400;font-variant-numeric:tabular-nums}
.dsh-sh-sorts{display:flex;align-items:center;gap:2px;background:var(--dsw-alias-bg-layer-2);border-radius:10px;padding:3px}
.dsh-sh-sort{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;border-radius:8px;padding:4px 10px;cursor:pointer;white-space:nowrap}
.dsh-sh-sort:hover{color:var(--dsw-alias-label-primary)}
.dsh-sh-sort[aria-pressed=true]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 0 0 .5px var(--dsw-alias-border-l1)}
.dsh-sh-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dsh-sh-search{flex:1;min-width:220px;display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;color:var(--dsw-alias-label-secondary);transition:border-color .15s}
.dsh-sh-search:focus-within{border-color:var(--dsw-alias-brand-primary)}
.dsh-sh-search input{flex:1;min-width:0;border:0;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.dsh-sh-search input::placeholder{color:var(--dsw-alias-label-secondary)}
.dsh-sh-clear{border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:15px;line-height:1;padding:2px 5px;border-radius:6px}
.dsh-sh-clear:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.dsh-sh-chips{display:flex;align-items:center;gap:6px}
.dsh-sh-chip{height:28px;padding:0 12px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.dsh-sh-chip:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
.dsh-sh-chip[aria-pressed=true]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
.dsh-sh-scroll{flex:1;min-height:0;overflow-y:auto;scrollbar-gutter:stable;padding:0 clamp(16px,3vw,40px) 40px}
.dsh-sh-inner{max-width:920px;margin:0 auto}
.dsh-sh-group{position:sticky;top:0;z-index:1;display:flex;align-items:baseline;gap:10px;padding:16px 10px 7px;background:var(--dsw-alias-bg-base)}
.dsh-sh-groupLabel{font-size:12px;font-weight:600;letter-spacing:.01em;white-space:nowrap}
.dsh-sh-groupPath{flex:1;min-width:0;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-sh-groupCount{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dsh-sh-rule{flex:none;height:.5px;background:var(--dsw-alias-border-l1);margin:0 10px 4px}
.dsh-sh-row{display:grid;grid-template-columns:auto 3px minmax(0,1fr);align-items:center;gap:10px;width:100%;padding:6px 10px;border:0;background:transparent;border-radius:10px;text-align:left;color:inherit;font:inherit;cursor:pointer}
.dsh-sh-row:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-sh-row:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.dsh-sh-row[data-archived=true] .dsh-sh-title{opacity:.6}
.dsh-sh-when{min-width:46px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.dsh-sh-accent{width:3px;height:28px;border-radius:2px;background:var(--dsh-ws-hue,var(--dsw-alias-border-l2))}
.dsh-sh-body{display:flex;flex-direction:column;min-width:0;gap:1px}
.dsh-sh-title{font-size:13px;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-sh-title[data-untitled=true]{color:var(--dsw-alias-label-secondary);font-style:italic}
.dsh-sh-meta{display:flex;align-items:center;gap:6px;min-width:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dsh-sh-ws{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:50%}
.dsh-sh-wsdot{width:6px;height:6px;border-radius:50%;background:var(--dsh-ws-hue,currentColor);flex:none}
.dsh-sh-dot{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.5;flex:none}
.dsh-sh-tag{font-size:10px;padding:0 5px;border-radius:5px;border:.5px solid var(--dsw-alias-border-l1);white-space:nowrap}
.dsh-sh-run{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary);flex:none}
.dsh-sh-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:80px 20px;color:var(--dsw-alias-label-secondary)}
.dsh-sh-more{margin:16px auto 0;display:block;height:32px;padding:0 18px;border-radius:16px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.dsh-sh-more:hover{background:var(--dsw-alias-bg-layer-2)}
`

    /* ── helpers ───────────────────────────────────────────────────────── */

    function pad2(value) {
      return String(value).padStart(2, '0')
    }

    function localDay(ms) {
      const date = new Date(ms)
      return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    }

    /** Stable per-Workspace accent: same Workspace, same colour, every session. */
    function hueOf(key) {
      let hash = 0
      const text = key || 'ungrouped'
      for (let index = 0; index < text.length; index += 1) {
        hash = (hash * 31 + text.charCodeAt(index)) % 360
      }
      return `hsl(${hash} 52% 56%)`
    }

    function clockLabel(ms) {
      const date = new Date(ms)
      return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
    }

    function relativeLabel(updatedAt, now, t) {
      if (!updatedAt) return ''
      const diff = Math.max(0, now - updatedAt)
      const minutes = Math.floor(diff / 60000)
      if (minutes < 1) return t('time.now')
      if (minutes < 60) return t('time.min', { n: minutes })
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return t('time.hour', { n: hours })
      const days = Math.floor(hours / 24)
      if (days < 30) return t('time.day', { n: days })
      const date = new Date(updatedAt)
      return t('time.date', { y: date.getFullYear(), m: pad2(date.getMonth() + 1), d: pad2(date.getDate()) })
    }

    function absoluteLabel(updatedAt) {
      if (!updatedAt) return ''
      const date = new Date(updatedAt)
      return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
    }

    function dayLabel(day, now, t) {
      const today = localDay(now)
      const yesterday = localDay(now - 86400000)
      if (day === today) return t('day.today')
      if (day === yesterday) return t('day.yesterday')
      const parts = day.split('-')
      const month = Number(parts[1])
      const date = Number(parts[2])
      return parts[0] === String(new Date(now).getFullYear()) ? t('day.md', { m: month, d: date }) : t('day.ymd', { y: parts[0], m: month, d: date })
    }

    function readView() {
      try {
        const raw = window.localStorage.getItem(STORE_KEY)
        const value = raw === null ? null : JSON.parse(raw)
        return value !== null && typeof value === 'object' ? value : {}
      } catch {
        return {}
      }
    }

    function saveView(view) {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(view))
      } catch {
        /* a blocked storage keeps the in-memory selection only */
      }
    }

    /** Project a framework snapshot service into a selector hook. */
    function snapshotHook(source) {
      return (selector) => {
        const subscribe = React.useCallback((listener) => source.subscribe(listener), [])
        const snapshot = React.useSyncExternalStore(subscribe, () => source.getSnapshot())
        return selector === undefined ? snapshot : selector(snapshot)
      }
    }

    /** Fallback when the surface does not carry the unified status Hook. */
    function useNoStatus() {
      return EMPTY_STATUS
    }

    function turnsOf(summary) {
      const stats = summary.projectionValues !== undefined ? summary.projectionValues.sessionStats : undefined
      const turns = stats !== undefined && stats !== null ? stats.turns : undefined
      return typeof turns === 'number' && turns > 0 ? turns : 0
    }

    function buildRows(list, workspaces, statuses, options) {
      const { query, sort, runningOnly, showArchived } = options
      const ids = list && Array.isArray(list.ids) ? list.ids : []
      const byId = (list && list.byId) || {}
      const archived = new Set((workspaces && workspaces.archivedSessionIds) || [])
      const pinned = new Set((workspaces && workspaces.pinnedSessionIds) || [])
      const owned = new Map()
      for (const workspace of (workspaces && workspaces.items) || []) {
        for (const id of workspace.sessionIds || []) {
          if (!owned.has(id)) owned.set(id, workspace)
        }
      }
      const needle = query.trim().toLowerCase()
      const rows = []
      for (const id of ids) {
        const summary = byId[id]
        if (summary === undefined || summary.blank || summary.origin === 'subagent') continue
        const isArchived = archived.has(id)
        if (isArchived && !showArchived) continue
        const status = statuses && typeof statuses.get === 'function' ? statuses.get(id) : undefined
        const running = status !== undefined && typeof status.running === 'boolean' ? status.running : summary.running === true
        if (runningOnly && !running) continue
        const workspace = owned.get(id)
        const title = typeof summary.title === 'string' ? summary.title.trim() : ''
        const workspaceTitle = workspace !== undefined && typeof workspace.title === 'string' ? workspace.title : ''
        const workspacePath = (workspace !== undefined && workspace.path) || summary.cwd || ''
        if (needle !== '') {
          const haystack = `${title}\n${workspaceTitle}\n${workspacePath}`.toLowerCase()
          if (!haystack.includes(needle)) continue
        }
        const workspaceId = workspace !== undefined ? workspace.workspaceId : ''
        rows.push({
          id,
          title,
          workspaceId,
          workspaceTitle,
          workspacePath,
          hue: hueOf(workspaceId),
          archived: isArchived,
          pinned: pinned.has(id) && !isArchived,
          running,
          turns: turnsOf(summary),
          updatedAt: typeof summary.updatedAt === 'number' ? summary.updatedAt : 0,
        })
      }
      const byRecency = (left, right) => (right.updatedAt - left.updatedAt) || (left.id < right.id ? -1 : 1)
      if (sort === 'title') {
        rows.sort((left, right) => (left.title || '\uffff').localeCompare(right.title || '\uffff') || byRecency(left, right))
      } else {
        rows.sort(byRecency)
      }
      return rows
    }

    /**
     * Split rows into sections: one per local day for "time", one per Workspace
     * for "workspace", and a single untreated section otherwise.
     */
    function buildSections(rows, sort, workspaces, now, t) {
      if (sort === 'time') {
        const sections = []
        let current = null
        for (const row of rows) {
          const day = localDay(row.updatedAt)
          if (current === null || current.key !== day) {
            current = { key: day, label: dayLabel(day, now, t), detail: '', count: 0, rows: [] }
            sections.push(current)
          }
          current.rows.push(row)
          current.count += 1
        }
        return sections
      }
      if (sort === 'workspace') {
        const order = new Map()
        for (const workspace of (workspaces && workspaces.items) || []) {
          if (!order.has(workspace.workspaceId)) order.set(workspace.workspaceId, order.size)
        }
        const groups = new Map()
        for (const row of rows) {
          if (!groups.has(row.workspaceId)) {
            groups.set(row.workspaceId, {
              key: row.workspaceId,
              label: row.workspaceTitle === '' ? t('ungrouped') : row.workspaceTitle,
              detail: row.workspaceId === '' ? '' : row.workspacePath,
              count: 0,
              rows: [],
            })
          }
          const group = groups.get(row.workspaceId)
          group.rows.push(row)
          group.count += 1
        }
        return Array.from(groups.values()).sort((left, right) => {
          if (left.key === '') return 1
          if (right.key === '') return -1
          return (order.get(left.key) ?? 0) - (order.get(right.key) ?? 0)
        })
      }
      return [{ key: 'all', label: null, detail: '', count: rows.length, rows }]
    }

    /* ── components ────────────────────────────────────────────────────── */

    function SessionHubIcon({ size }) {
      const edge = typeof size === 'number' && size > 0 ? size : 18
      return h(
        'svg',
        { width: edge, height: edge, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true, focusable: 'false' },
        h('rect', { x: 1.75, y: 2.75, width: 12.5, height: 10.5, rx: 2.5, stroke: 'currentColor', strokeWidth: 1.2 }),
        h('path', { d: 'M4.5 6.1h7M4.5 8.4h7M4.5 10.7h4', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }),
      )
    }

    function SortButton({ active, label, onSelect }) {
      return h('button', {
        type: 'button',
        className: 'dsh-sh-sort',
        'aria-pressed': active,
        onClick: onSelect,
      }, label)
    }

    function Chip({ active, label, onSelect }) {
      return h('button', {
        type: 'button',
        className: 'dsh-sh-chip',
        'aria-pressed': active,
        onClick: onSelect,
      }, label)
    }

    /** Contain a render fault inside this panel instead of blanking the slot. */
    class HubBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }

      static getDerivedStateFromError(error) {
        return { error }
      }

      componentDidCatch(error, info) {
        console.error('[session-hub] render failed', error, info)
      }

      render() {
        if (this.state.error !== null) {
          return h(
            'div',
            { className: 'dsh-sh-page' },
            h('style', null, CSS),
            h('div', { className: 'dsh-sh-empty' }, this.props.t('error')),
          )
        }
        return this.props.children
      }
    }

    function Row({ row, mode, now, openSession, t }) {
      const untitled = row.title === ''
      const workspaceLabel = row.workspaceTitle === '' ? t('ungrouped') : row.workspaceTitle
      const when = mode === 'time' ? clockLabel(row.updatedAt) : relativeLabel(row.updatedAt, now, t)
      const meta = [
        h(
          'span',
          { key: 'ws', className: 'dsh-sh-ws', title: row.workspacePath || workspaceLabel },
          h('span', { className: 'dsh-sh-wsdot', style: { '--dsh-ws-hue': row.hue } }),
          workspaceLabel,
        ),
      ]
      if (row.turns > 0) {
        meta.push(h('span', { key: 'd1', className: 'dsh-sh-dot' }))
        meta.push(h('span', { key: 'turns' }, t('turns', { n: row.turns })))
      }
      if (row.pinned) {
        meta.push(h('span', { key: 'd2', className: 'dsh-sh-dot' }))
        meta.push(h('span', { key: 'pin', className: 'dsh-sh-tag' }, t('pinned')))
      }
      if (row.archived) {
        meta.push(h('span', { key: 'd3', className: 'dsh-sh-dot' }))
        meta.push(h('span', { key: 'arch', className: 'dsh-sh-tag' }, t('archived')))
      }
      return h(
        'button',
        {
          type: 'button',
          className: 'dsh-sh-row',
          'data-archived': row.archived,
          'aria-label': t('open', { title: untitled ? t('untitled') : row.title }),
          title: `${absoluteLabel(row.updatedAt)}${row.workspacePath ? `\n${row.workspacePath}` : ''}`,
          onClick: () => openSession(row.id),
        },
        h('span', { className: 'dsh-sh-when' }, when),
        h('span', { className: 'dsh-sh-accent', style: { '--dsh-ws-hue': row.hue }, 'aria-hidden': true }),
        h(
          'span',
          { className: 'dsh-sh-body' },
          h('span', { className: 'dsh-sh-title', 'data-untitled': untitled, title: row.title }, untitled ? t('untitled') : row.title),
          h('span', { className: 'dsh-sh-meta' }, meta),
        ),
      )
    }

    function SessionHubPage(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key
      return h(HubBoundary, { t }, h(SessionHubView, props))
    }

    function SessionHubView(props) {
      const openSession = props.openSession
      const t = typeof props.t === 'function' ? props.t : (key) => key
      // Standard slot props win when the surface supplies them; the injected
      // snapshot hooks cover a surface that does not.
      const useSessions = typeof props.useSessions === 'function' ? props.useSessions : props.useSessionList
      const useWorkspaces = typeof props.useWorkspaces === 'function' ? props.useWorkspaces : props.useWorkspaceList
      const useStatus = typeof props.useSessionStatus === 'function' ? props.useSessionStatus : useNoStatus

      const list = useSessions((snapshot) => snapshot)
      const workspaces = useWorkspaces((snapshot) => snapshot)
      const statuses = useStatus((snapshot) => snapshot)

      const stored = React.useMemo(readView, [])
      const [query, setQuery] = React.useState('')
      const [sort, setSort] = React.useState(SORTS.includes(stored.sort) ? stored.sort : 'time')
      const [runningOnly, setRunningOnly] = React.useState(stored.runningOnly === true)
      const [showArchived, setShowArchived] = React.useState(stored.showArchived === true)
      const [limit, setLimit] = React.useState(PAGE_LIMIT)
      const [now, setNow] = React.useState(() => Date.now())

      React.useEffect(() => {
        saveView({ sort, runningOnly, showArchived })
      }, [sort, runningOnly, showArchived])

      React.useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60000)
        return () => window.clearInterval(timer)
      }, [])

      React.useEffect(() => {
        setLimit(PAGE_LIMIT)
      }, [query, sort, runningOnly, showArchived])

      const rows = React.useMemo(
        () => buildRows(list, workspaces, statuses, { query, sort, runningOnly, showArchived }),
        [list, workspaces, statuses, query, sort, runningOnly, showArchived],
      )

      const sections = React.useMemo(
        () => buildSections(rows, sort, workspaces, now, t),
        [rows, sort, workspaces, now, t],
      )

      const workspaceCount = React.useMemo(() => {
        const seen = new Set()
        for (const row of rows) if (row.workspaceId !== '') seen.add(row.workspaceId)
        return seen.size
      }, [rows])

      const phase = list && list.phase !== undefined ? list.phase : 'ready'
      const body = []
      if (rows.length === 0) {
        const message = phase !== 'ready' && query.trim() === '' ? t('loading') : query.trim() !== '' || runningOnly || showArchived ? t('empty.search') : t('empty')
        body.push(h('div', { key: 'empty', className: 'dsh-sh-empty' }, message))
      } else {
        let shown = 0
        for (const section of sections) {
          if (shown >= limit) break
          if (section.label !== null) {
            body.push(
              h(
                'div',
                { key: `g:${section.key}`, className: 'dsh-sh-group' },
                h('span', { className: 'dsh-sh-groupLabel' }, section.label),
                h('span', { className: 'dsh-sh-groupPath', title: section.detail }, section.detail),
                h('span', { className: 'dsh-sh-groupCount' }, String(section.count)),
              ),
            )
            body.push(h('div', { key: `r:${section.key}`, className: 'dsh-sh-rule' }))
          }
          for (const row of section.rows) {
            if (shown >= limit) break
            shown += 1
            body.push(h(Row, { key: row.id, row, mode: sort, now, openSession, t }))
          }
        }
        const remaining = rows.length - shown
        if (remaining > 0) {
          body.push(
            h('button', {
              key: 'more',
              type: 'button',
              className: 'dsh-sh-more',
              onClick: () => setLimit(limit + PAGE_LIMIT),
            }, t('more', { n: remaining })),
          )
        }
      }

      return h(
        'section',
        { className: 'dsh-sh-page', 'aria-label': t('title'), 'data-testid': 'session-hub-page' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'dsh-sh-head' },
          h(
            'div',
            { className: 'dsh-sh-titleRow' },
            h(
              'h1',
              { className: 'dsh-sh-h1' },
              t('title'),
              h('span', { className: 'dsh-sh-count' }, t('count', { n: rows.length, w: workspaceCount })),
            ),
            h(
              'div',
              { className: 'dsh-sh-sorts', role: 'group', 'aria-label': t('sort.label') },
              h(SortButton, { active: sort === 'time', label: t('sort.time'), onSelect: () => setSort('time') }),
              h(SortButton, { active: sort === 'recent', label: t('sort.recent'), onSelect: () => setSort('recent') }),
              h(SortButton, { active: sort === 'workspace', label: t('sort.workspace'), onSelect: () => setSort('workspace') }),
              h(SortButton, { active: sort === 'title', label: t('sort.title'), onSelect: () => setSort('title') }),
            ),
          ),
          h(
            'div',
            { className: 'dsh-sh-tools' },
            h(
              'div',
              { className: 'dsh-sh-search' },
              h('input', {
                type: 'search',
                value: query,
                placeholder: t('search.placeholder'),
                'aria-label': t('search.placeholder'),
                autoFocus: true,
                onChange: (event) => setQuery(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Escape' && query !== '') {
                    event.preventDefault()
                    setQuery('')
                  }
                },
              }),
              query === '' ? null : h('button', {
                type: 'button',
                className: 'dsh-sh-clear',
                'aria-label': t('search.clear'),
                onClick: () => setQuery(''),
              }, '\u00d7'),
            ),
            h(
              'div',
              { className: 'dsh-sh-chips' },
              h(Chip, { active: runningOnly, label: t('filter.running'), onSelect: () => setRunningOnly(!runningOnly) }),
              h(Chip, { active: showArchived, label: t('filter.archived'), onSelect: () => setShowArchived(!showArchived) }),
            ),
          ),
        ),
        h('div', { className: 'dsh-sh-scroll' }, h('div', { className: 'dsh-sh-inner' }, body)),
      )
    }

    /* ── dictionaries ─────────────────────────────────────────────────── */

    const ZH = {
      panel: '\u4f1a\u8bdd\u603b\u89c8',
      title: '\u5168\u90e8\u4f1a\u8bdd',
      count: '\u5171 {n} \u4e2a\u4f1a\u8bdd \u00b7 {w} \u4e2a\u5de5\u4f5c\u533a',
      'search.placeholder': '\u641c\u7d22\u6807\u9898\u3001\u5de5\u4f5c\u533a\u6216\u8def\u5f84',
      'search.clear': '\u6e05\u9664\u641c\u7d22',
      'sort.label': '\u6392\u5e8f',
      'sort.time': '\u6309\u65e5\u671f',
      'sort.recent': '\u6700\u8fd1\u6d3b\u52a8',
      'sort.workspace': '\u6309\u5de5\u4f5c\u533a',
      'sort.title': '\u6309\u6807\u9898',
      'filter.running': '\u8fd0\u884c\u4e2d',
      'filter.archived': '\u542b\u5df2\u5f52\u6863',
      untitled: '\u672a\u547d\u540d',
      ungrouped: '\u672a\u5f52\u5165\u5de5\u4f5c\u533a',
      archived: '\u5df2\u5f52\u6863',
      pinned: '\u56fa\u5b9a',
      turns: '{n} \u8f6e',
      'day.today': '\u4eca\u5929',
      'day.yesterday': '\u6628\u5929',
      'day.md': '{m} \u6708 {d} \u65e5',
      'day.ymd': '{y} \u5e74 {m} \u6708 {d} \u65e5',
      'time.now': '\u521a\u521a',
      'time.min': '{n} \u5206\u949f\u524d',
      'time.hour': '{n} \u5c0f\u65f6\u524d',
      'time.day': '{n} \u5929\u524d',
      'time.date': '{y}-{m}-{d}',
      empty: '\u8fd8\u6ca1\u6709\u4efb\u4f55\u4f1a\u8bdd',
      'empty.search': '\u6ca1\u6709\u7b26\u5408\u7b5b\u9009\u6761\u4ef6\u7684\u4f1a\u8bdd',
      loading: '\u6b63\u5728\u8f7d\u5165\u4f1a\u8bdd\u2026',
      more: '\u663e\u793a\u66f4\u591a\uff08\u8fd8\u5269 {n} \u4e2a\uff09',
      open: '\u6253\u5f00\u4f1a\u8bdd\uff1a{title}',
      error: '\u4f1a\u8bdd\u603b\u89c8\u6e32\u67d3\u5931\u8d25\uff0c\u8be6\u60c5\u89c1\u63a7\u5236\u53f0\u3002',
    }

    const EN = {
      panel: 'All sessions',
      title: 'All sessions',
      count: '{n} sessions · {w} workspaces',
      'search.placeholder': 'Search title, workspace, or path',
      'search.clear': 'Clear search',
      'sort.label': 'Sort',
      'sort.time': 'By day',
      'sort.recent': 'Recent activity',
      'sort.workspace': 'By workspace',
      'sort.title': 'By title',
      'filter.running': 'Running',
      'filter.archived': 'Include archived',
      untitled: 'Untitled',
      ungrouped: 'No workspace',
      archived: 'Archived',
      pinned: 'Pinned',
      turns: '{n} turns',
      'day.today': 'Today',
      'day.yesterday': 'Yesterday',
      'day.md': '{m}/{d}',
      'day.ymd': '{y}-{m}-{d}',
      'time.now': 'just now',
      'time.min': '{n} min ago',
      'time.hour': '{n} h ago',
      'time.day': '{n} d ago',
      'time.date': '{y}-{m}-{d}',
      empty: 'No sessions yet',
      'empty.search': 'No session matches this filter',
      loading: 'Loading sessions…',
      more: 'Show more ({n} left)',
      open: 'Open session: {title}',
      error: 'Session Hub failed to render; see the console for details.',
    }

    /* ── plugin ────────────────────────────────────────────────────────── */

    return {
      inject: ['slots', 'locale', 'sessions', 'workspaces', 'uiWorkspace'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'session-hub: dictionaries')
        const t = ctx.locale.bind(NS)
        const useSessions = snapshotHook(ctx.sessions.list)
        const useWorkspaces = snapshotHook(ctx.workspaces.list)
        const openSession = (sessionId) => {
          ctx.uiWorkspace.openSession(sessionId)
        }
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
          inject: () => ({ useSessionList: useSessions, useWorkspaceList: useWorkspaces, openSession }),
        }, SessionHubPage))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 20,
          locale: NS,
          label: () => t('panel'),
        }, SessionHubIcon))
      },
    }
  },
})
