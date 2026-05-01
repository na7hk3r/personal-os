import { useMemo, useState } from 'react'
import { Keyboard, Search } from 'lucide-react'
import { SHORTCUT_GROUPS, type ShortcutGroup } from '../shortcuts'
import { messages } from '../messages'

function filterGroups(groups: ShortcutGroup[], query: string): ShortcutGroup[] {
  const q = query.trim().toLowerCase()
  if (!q) return groups
  return groups
    .map((g) => ({
      ...g,
      entries: g.entries.filter((e) =>
        [e.keys, e.action, e.description ?? '', e.scope]
          .join(' ')
          .toLowerCase()
          .includes(q),
      ),
    }))
    .filter((g) => g.entries.length > 0)
}

function KeyChips({ combo }: { combo: string }) {
  // "Ctrl/Cmd + K" → ["Ctrl/Cmd", "K"]
  const parts = combo.split('+').map((p) => p.trim()).filter(Boolean)
  return (
    <span className="flex flex-wrap items-center gap-1">
      {parts.map((part, i) => (
        <kbd
          key={`${part}-${i}`}
          className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-white"
        >
          {part}
        </kbd>
      ))}
    </span>
  )
}

export function ShortcutsPage() {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => filterGroups(SHORTCUT_GROUPS, query), [query])
  const total = useMemo(
    () => filtered.reduce((acc, g) => acc + g.entries.length, 0),
    [filtered],
  )

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-8 text-white">
      <header className="flex items-center gap-3">
        <Keyboard size={22} className="text-accent-light" aria-hidden />
        <div>
          <h1 className="text-2xl font-semibold">Atajos de teclado</h1>
          <p className="text-sm text-muted">
            Catálogo completo de atajos disponibles en Personal OS.
          </p>
        </div>
      </header>

      <label className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-surface-light px-3 py-2">
        <Search size={16} className="text-muted" aria-hidden />
        <span className="sr-only">Buscar atajo</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por tecla o acción"
          className="w-full bg-transparent text-sm text-white placeholder:text-muted focus:outline-none"
        />
      </label>

      {total === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-surface-light p-6 text-sm text-muted">
          {messages.empty.shortcuts}
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {filtered.map((group) => (
            <article
              key={group.id}
              className="rounded-2xl border border-border bg-surface-light/85 p-5"
            >
              <h2 className="text-base font-semibold">{group.title}</h2>
              <ul className="mt-3 divide-y divide-border/50">
                {group.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-4 py-3"
                  >
                    <div>
                      <p className="text-sm text-white">{entry.action}</p>
                      {entry.description && (
                        <p className="mt-0.5 text-xs text-muted">{entry.description}</p>
                      )}
                    </div>
                    <KeyChips combo={entry.keys} />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
