import { useMemo, useState } from 'react'
import { Pin, PinOff, Plus, Search } from 'lucide-react'
import { useWorkStore } from '../store'
import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from '../events'

type SortMode = 'recent' | 'alpha'

export function NoteEditor() {
  const { notes, addNote, updateNote, deleteNote } = useWorkStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const selected = notes.find((n) => n.id === selectedId)

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? notes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q)),
        )
      : notes

    const sorted = [...filtered].sort((a, b) => {
      // Pinned siempre arriba.
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
      if (sortMode === 'alpha') return a.title.localeCompare(b.title, 'es')
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return sorted
  }, [notes, search, sortMode])

  const handleNew = () => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const note = {
      id,
      title: 'Nueva nota',
      content: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
      pinned: false,
    }
    addNote(note)
    setSelectedId(id)
    setTitle(note.title)
    setContent('')

    window.storage.execute(
      'INSERT INTO work_notes (id, title, content, tags, created_at, updated_at, pinned) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [id, note.title, '', '[]', now, now],
    )

    eventBus.emit(WORK_EVENTS.NOTE_CREATED, { id })
  }

  const handleSave = () => {
    if (!selectedId) return
    const now = new Date().toISOString()
    updateNote(selectedId, { title, content, updatedAt: now })
    window.storage.execute(
      'UPDATE work_notes SET title = ?, content = ?, updated_at = ? WHERE id = ?',
      [title, content, now, selectedId],
    )
  }

  const handleDelete = (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      window.setTimeout(() => setConfirmDeleteId((cur) => (cur === id ? null : cur)), 3000)
      return
    }

    deleteNote(id)
    window.storage.execute('DELETE FROM work_notes WHERE id = ?', [id])
    setConfirmDeleteId(null)
    if (selectedId === id) {
      setSelectedId(null)
      setTitle('')
      setContent('')
    }
  }

  const handleTogglePin = (id: string, currentPinned: boolean) => {
    const next = !currentPinned
    updateNote(id, { pinned: next })
    window.storage.execute('UPDATE work_notes SET pinned = ? WHERE id = ?', [next ? 1 : 0, id])
  }

  const handleSelect = (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (note) {
      setSelectedId(id)
      setTitle(note.title)
      setContent(note.content)
    }
  }

  return (
    <div className="flex gap-4 h-[500px]">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 bg-surface-light rounded-xl border border-border overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border flex justify-between items-center">
          <span className="text-sm font-semibold">Notas</span>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-xs text-accent-light hover:bg-accent/25"
          >
            <Plus size={12} />
            Nueva
          </button>
        </div>

        <div className="p-2 border-b border-border/60 space-y-2">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-md border border-border bg-surface pl-7 pr-2 py-1.5 text-xs placeholder:text-muted/50 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setSortMode('recent')}
              className={`flex-1 rounded border px-2 py-1 text-[10px] transition-colors ${
                sortMode === 'recent'
                  ? 'border-accent/50 bg-accent/15 text-accent-light'
                  : 'border-border bg-surface text-muted hover:text-white'
              }`}
            >
              Recientes
            </button>
            <button
              onClick={() => setSortMode('alpha')}
              className={`flex-1 rounded border px-2 py-1 text-[10px] transition-colors ${
                sortMode === 'alpha'
                  ? 'border-accent/50 bg-accent/15 text-accent-light'
                  : 'border-border bg-surface text-muted hover:text-white'
              }`}
            >
              Aâ€“Z
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 && (
            <div className="text-center text-xs text-muted/60 py-6">
              {search ? 'Sin resultados' : 'No hay notas todavÃ­a'}
            </div>
          )}
          {filteredNotes.map((n) => {
            const isConfirming = confirmDeleteId === n.id
            return (
              <div
                key={n.id}
                onClick={() => handleSelect(n.id)}
                className={`px-3 py-2 rounded-lg text-sm cursor-pointer group ${
                  selectedId === n.id
                    ? 'bg-accent/20 text-accent-light'
                    : 'text-muted hover:bg-surface-lighter'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {n.pinned && <Pin size={10} className="text-accent-light shrink-0" />}
                      <span className="truncate">{n.title}</span>
                    </div>
                    {n.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {n.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] text-muted/80"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTogglePin(n.id, Boolean(n.pinned))
                      }}
                      title={n.pinned ? 'Quitar pin' : 'Fijar nota'}
                      className="text-muted hover:text-accent-light"
                    >
                      {n.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(n.id)
                      }}
                      title={isConfirming ? 'Confirmar eliminaciÃ³n' : 'Eliminar nota'}
                      className={`text-[10px] font-medium ${
                        isConfirming ? 'text-red-300' : 'text-muted hover:text-red-400'
                      }`}
                    >
                      {isConfirming ? 'Â¿?' : 'âœ•'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-surface-light rounded-xl border border-border flex flex-col overflow-hidden">
        {selected ? (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              className="bg-transparent border-b border-border px-4 py-3 text-lg font-semibold outline-none"
              placeholder="TÃ­tulo"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              className="flex-1 bg-transparent px-4 py-3 text-sm resize-none outline-none leading-relaxed"
              placeholder="Escribe aquÃ­..."
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            Selecciona o crea una nota
          </div>
        )}
      </div>
    </div>
  )
}
