import { useState } from 'react'
import { useWorkStore } from '../store'
import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from '../events'

export function KanbanBoard() {
  const { columns, cards, addCard, moveCard, deleteCard } = useWorkStore()
  const [newCardTitle, setNewCardTitle] = useState<Record<string, string>>({})

  const handleAddCard = async (columnId: string) => {
    const title = newCardTitle[columnId]?.trim()
    if (!title) return

    const id = crypto.randomUUID()
    const position = cards.filter((c) => c.columnId === columnId).length

    const card = {
      id,
      columnId,
      title,
      description: '',
      labels: [],
      dueDate: null,
      position,
    }

    addCard(card)
    setNewCardTitle((prev) => ({ ...prev, [columnId]: '' }))

    await window.storage.execute(
      'INSERT INTO work_cards (id, column_id, title, description, labels, due_date, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, columnId, title, '', '[]', null, position],
    )

    eventBus.emit(WORK_EVENTS.TASK_CREATED, { id, title, columnId })
  }

  const handleDeleteCard = async (id: string) => {
    deleteCard(id)
    await window.storage.execute('DELETE FROM work_cards WHERE id = ?', [id])
  }

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position)

  return (
    <div className="scrollbar-kanban flex gap-4 overflow-x-auto pb-4">
      {sortedColumns.map((col) => {
        const colCards = cards
          .filter((c) => c.columnId === col.id)
          .sort((a, b) => a.position - b.position)

        return (
          <div
            key={col.id}
            className="flex-shrink-0 w-72 rounded-xl border border-border bg-surface-light shadow-lg shadow-black/25 transition-shadow duration-200 hover:shadow-xl hover:shadow-black/35 animate-slide-up"
          >
            {/* Column header */}
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent/70 shadow-[0_0_6px_1px_rgba(124,58,237,0.5)]" />
                <h4 className="text-sm font-semibold">{col.name}</h4>
              </div>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted tabular-nums">
                {colCards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 p-2 min-h-[100px]">
              {colCards.map((card) => (
                <div
                  key={card.id}
                  className="group card-interactive rounded-lg border border-border/50 bg-surface p-3 animate-fade-in"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-snug">{card.title}</p>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="mt-0.5 flex-shrink-0 rounded p-0.5 text-xs text-muted opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                  {card.description && (
                    <p className="mt-1 truncate text-xs text-muted">{card.description}</p>
                  )}
                </div>
              ))}

              {colCards.length === 0 && (
                <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border/40 text-xs text-muted/50">
                  Sin tareas
                </div>
              )}
            </div>

            {/* New card input */}
            <div className="border-t border-border/50 p-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva tarea..."
                  value={newCardTitle[col.id] || ''}
                  onChange={(e) =>
                    setNewCardTitle((prev) => ({ ...prev, [col.id]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCard(col.id)}
                  className="flex-1 rounded border border-border bg-surface px-2 py-1.5 text-sm placeholder:text-muted/50 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
                <button
                  onClick={() => handleAddCard(col.id)}
                  className="rounded bg-accent/20 px-2.5 py-1.5 text-sm font-bold text-accent-light transition-colors hover:bg-accent/35 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
