import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Notebook, Link2, ListTodo, LayoutDashboard, SlidersHorizontal, CalendarDays, Sparkles, BarChart3 } from 'lucide-react'
import { storageAPI } from '@core/storage/StorageAPI'
import { pluginManager } from '@core/plugins/PluginManager'

export interface CommandResult {
  id: string
  kind: 'note' | 'link' | 'card' | 'nav' | 'action'
  title: string
  subtitle?: string
  ctaPath: string
}

const NAV_RESULTS: CommandResult[] = [
  { id: 'nav:dashboard', kind: 'nav', title: 'Dashboard', ctaPath: '/' },
  { id: 'nav:control', kind: 'nav', title: 'Control Center', ctaPath: '/control' },
  { id: 'nav:notes', kind: 'nav', title: 'Notas', ctaPath: '/notes' },
  { id: 'nav:links', kind: 'nav', title: 'Enlaces', ctaPath: '/links' },
  { id: 'nav:planner', kind: 'nav', title: 'Planner', ctaPath: '/planner' },
  { id: 'nav:calendar', kind: 'nav', title: 'Calendario unificado', ctaPath: '/calendar' },
  { id: 'nav:review', kind: 'nav', title: 'Review semanal/mensual', ctaPath: '/review' },
  { id: 'nav:profile', kind: 'nav', title: 'Perfil (export/import)', ctaPath: '/profile' },
  { id: 'nav:shortcuts', kind: 'nav', title: 'Atajos de teclado', ctaPath: '/shortcuts' },
]

const ICONS: Record<CommandResult['kind'], React.ComponentType<{ size?: number; className?: string }>> = {
  note: Notebook,
  link: Link2,
  card: ListTodo,
  nav: LayoutDashboard,
  action: Sparkles,
}

async function searchNotes(q: string): Promise<CommandResult[]> {
  try {
    const rows = await storageAPI.query<{ id: string; title: string }>(
      "SELECT id, title FROM work_notes WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ? ORDER BY updated_at DESC LIMIT 10",
      [`%${q}%`, `%${q}%`],
    )
    return rows.map((r) => ({ id: `note:${r.id}`, kind: 'note', title: r.title || 'Sin título', ctaPath: '/notes' }))
  } catch { return [] }
}

async function searchLinks(q: string): Promise<CommandResult[]> {
  try {
    const rows = await storageAPI.query<{ id: string; title: string; url: string; category: string }>(
      "SELECT id, title, url, category FROM work_links WHERE LOWER(title) LIKE ? OR LOWER(url) LIKE ? OR LOWER(category) LIKE ? LIMIT 10",
      [`%${q}%`, `%${q}%`, `%${q}%`],
    )
    return rows.map((r) => ({ id: `link:${r.id}`, kind: 'link', title: r.title, subtitle: r.url, ctaPath: '/links' }))
  } catch { return [] }
}

async function searchCards(q: string): Promise<CommandResult[]> {
  try {
    const rows = await storageAPI.query<{ id: string; title: string; column_id: string }>(
      "SELECT id, title, column_id FROM work_cards WHERE archived = 0 AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?) LIMIT 10",
      [`%${q}%`, `%${q}%`],
    )
    return rows.map((r) => ({ id: `card:${r.id}`, kind: 'card', title: r.title, subtitle: r.column_id, ctaPath: '/work' }))
  } catch { return [] }
}

function searchNav(q: string): CommandResult[] {
  return NAV_RESULTS.filter((r) => r.title.toLowerCase().includes(q))
}

function searchPluginPages(q: string): CommandResult[] {
  return pluginManager.getActivePages()
    .filter((p) => p.title.toLowerCase().includes(q) || p.path.toLowerCase().includes(q))
    .map((p) => ({ id: `nav:${p.id}`, kind: 'nav', title: p.title, subtitle: p.path, ctaPath: p.path }))
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CommandResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')
      if (isCmdK) {
        e.preventDefault()
        setOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
    else { setQuery(''); setResults([]); setActiveIndex(0) }
  }, [open])

  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      setResults([...NAV_RESULTS, ...searchPluginPages('')])
      setActiveIndex(0)
      return
    }
    let cancelled = false
    void (async () => {
      const [notes, links, cards] = await Promise.all([
        searchNotes(q),
        searchLinks(q),
        searchCards(q),
      ])
      if (cancelled) return
      const navResults = [...searchNav(q), ...searchPluginPages(q)]
      setResults([...navResults, ...cards, ...notes, ...links])
      setActiveIndex(0)
    })()
    return () => { cancelled = true }
  }, [query])

  const visibleResults = useMemo(() => results.slice(0, 25), [results])

  const handleSelect = (result: CommandResult) => {
    setOpen(false)
    navigate(result.ctaPath)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, visibleResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const sel = visibleResults[activeIndex]
      if (sel) handleSelect(sel)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-24 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Búsqueda global"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface-light shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={16} className="text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar notas, tareas, enlaces, navegación..."
            aria-label="Buscar comandos"
            role="combobox"
            aria-expanded={visibleResults.length > 0}
            aria-controls="command-palette-listbox"
            aria-activedescendant={visibleResults[activeIndex] ? `cmd-result-${visibleResults[activeIndex].id}` : undefined}
            aria-autocomplete="list"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted/70"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar búsqueda"
            className="rounded p-1 text-muted hover:text-white"
            title="Cerrar (Esc)"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div
          id="command-palette-listbox"
          role="listbox"
          aria-label="Resultados"
          className="max-h-[55vh] overflow-y-auto p-2"
        >
          {visibleResults.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted">Sin resultados</p>
          ) : (
            visibleResults.map((r, i) => {
              const Icon = ICONS[r.kind]
              const active = i === activeIndex
              return (
                <button
                  key={r.id}
                  id={`cmd-result-${r.id}`}
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(r)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    active ? 'bg-accent/15 text-white' : 'text-foreground/80 hover:bg-surface-lighter'
                  }`}
                >
                  <Icon size={14} className="shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.title}</p>
                    {r.subtitle && <p className="truncate text-xs text-muted">{r.subtitle}</p>}
                  </div>
                  <span className="shrink-0 rounded bg-surface-lighter px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                    {r.kind}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] uppercase tracking-wider text-muted">
          <span><kbd className="rounded bg-surface-lighter px-1">↑</kbd> <kbd className="rounded bg-surface-lighter px-1">↓</kbd> navegar</span>
          <span><kbd className="rounded bg-surface-lighter px-1">Enter</kbd> abrir</span>
          <span><kbd className="rounded bg-surface-lighter px-1">Esc</kbd> cerrar</span>
          <span className="flex items-center gap-1"><BarChart3 size={10} /> {visibleResults.length} resultados</span>
        </div>
      </div>
    </div>
  )
}

export const CommandPaletteIcons = { Search, SlidersHorizontal, CalendarDays }
