import { useState } from 'react'
import { useWorkStore } from '../store'
import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from '../events'

export function NoteEditor() {
  const { notes, addNote, updateNote, deleteNote } = useWorkStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const selected = notes.find((n) => n.id === selectedId)

  const handleNew = () => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const note = { id, title: 'Nueva nota', content: '', tags: [], createdAt: now, updatedAt: now }
    addNote(note)
    setSelectedId(id)
    setTitle(note.title)
    setContent('')

    window.storage.execute(
      'INSERT INTO work_notes (id, title, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
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
    deleteNote(id)
    window.storage.execute('DELETE FROM work_notes WHERE id = ?', [id])
    if (selectedId === id) {
      setSelectedId(null)
      setTitle('')
      setContent('')
    }
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
      <div className="w-56 flex-shrink-0 bg-surface-light rounded-xl border border-border overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border flex justify-between items-center">
          <span className="text-sm font-semibold">Notas</span>
          <button onClick={handleNew} className="text-accent-light text-sm hover:underline">
            + Nueva
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes.map((n) => (
            <div
              key={n.id}
              onClick={() => handleSelect(n.id)}
              className={`px-3 py-2 rounded-lg text-sm cursor-pointer group flex justify-between items-center ${
                selectedId === n.id
                  ? 'bg-accent/20 text-accent-light'
                  : 'text-muted hover:bg-surface-lighter'
              }`}
            >
              <span className="truncate">{n.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(n.id) }}
                className="text-xs opacity-0 group-hover:opacity-100 hover:text-red-400"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-surface-light rounded-xl border border-border flex flex-col overflow-hidden">
        {selectedId ? (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              className="bg-transparent border-b border-border px-4 py-3 text-lg font-semibold outline-none"
              placeholder="Título"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              className="flex-1 bg-transparent px-4 py-3 text-sm resize-none outline-none"
              placeholder="Escribe aquí..."
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
