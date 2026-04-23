import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useWorkStore } from '../store'
import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from '../events'
import { interruptWorkFocusSession, startWorkFocusSession } from '../focus'
import { SortableCard } from './SortableCard'
import { CardDetailModal } from './CardDetailModal'
import type { Card } from '../types'

interface ColumnDropZoneProps {
  id: string
  className: string
  children: React.ReactNode
}

function ColumnDropZone({ id, className, children }: ColumnDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'ring-1 ring-accent/40 ring-inset' : ''}`}
    >
      {children}
    </div>
  )
}

export function KanbanBoard() {
  const { columns, cards, focusSessions, addCard, reorderCards, deleteCard, currentFocusSession, setColumns } = useWorkStore()
  const [newCardTitle, setNewCardTitle] = useState<Record<string, string>>({})
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [columnDraft, setColumnDraft] = useState<{ name: string; wipLimit: string }>({ name: '', wipLimit: '' })

  // Conteo de sesiones de foco por tarea (solo sesiones finalizadas).
  const focusCountByTask = focusSessions.reduce<Map<string, number>>((acc, session) => {
    if (!session.taskId || !session.endTime) return acc
    acc.set(session.taskId, (acc.get(session.taskId) ?? 0) + 1)
    return acc
  }, new Map())

  const isDoneColumn = (columnId: string) =>
    columnId === 'col-done' || columns.some((column) => column.id === columnId && /hecho|done/i.test(column.name))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id)
    if (card) setActiveCard(card)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)
    if (!over) return

    const draggedCard = cards.find((c) => c.id === active.id)
    if (!draggedCard) return

    const sourceColumnId = draggedCard.columnId

    // Determinar columna destino e índice de inserción
    let targetColumnId: string
    let overCardId: string | null = null

    const overIsColumn = columns.some((col) => col.id === over.id)
    if (overIsColumn) {
      targetColumnId = String(over.id)
    } else {
      const overCard = cards.find((c) => c.id === over.id)
      if (!overCard) return
      targetColumnId = overCard.columnId
      overCardId = overCard.id
    }

    // Si no hay cambio real (misma columna + misma posición), abortar
    if (sourceColumnId === targetColumnId && overCardId === draggedCard.id) return

    // Construir nuevo orden para columna destino
    const targetSiblings = cards
      .filter((c) => c.columnId === targetColumnId && c.id !== draggedCard.id)
      .sort((a, b) => a.position - b.position)

    let insertIndex = targetSiblings.length
    if (overCardId) {
      const idx = targetSiblings.findIndex((c) => c.id === overCardId)
      if (idx >= 0) insertIndex = idx
    }

    const newTargetOrder = [
      ...targetSiblings.slice(0, insertIndex),
      draggedCard,
      ...targetSiblings.slice(insertIndex),
    ]

    const updates: Array<{ id: string; columnId: string; position: number }> = newTargetOrder.map(
      (card, idx) => ({ id: card.id, columnId: targetColumnId, position: idx }),
    )

    // Si cambió de columna, también re-sloteamos la columna origen
    if (sourceColumnId !== targetColumnId) {
      const sourceSiblings = cards
        .filter((c) => c.columnId === sourceColumnId && c.id !== draggedCard.id)
        .sort((a, b) => a.position - b.position)
      sourceSiblings.forEach((card, idx) => {
        updates.push({ id: card.id, columnId: sourceColumnId, position: idx })
      })
    }

    // Filtrar updates que no cambian nada (optimización)
    const existingById = new Map(cards.map((c) => [c.id, c]))
    const realUpdates = updates.filter((u) => {
      const prev = existingById.get(u.id)
      return !prev || prev.columnId !== u.columnId || prev.position !== u.position
    })

    if (realUpdates.length === 0) return

    // Apply atomic store update
    reorderCards(realUpdates)

    // Persist to SQLite (secuencial pero sin await en el loop de UI)
    if (window.storage) {
      await Promise.all(
        realUpdates.map((u) =>
          window.storage.execute(
            `UPDATE work_cards SET column_id = ?, position = ? WHERE id = ?`,
            [u.columnId, u.position, u.id],
          ),
        ),
      )
    }

    if (sourceColumnId !== targetColumnId) {
      eventBus.emit(WORK_EVENTS.TASK_MOVED, {
        cardId: draggedCard.id,
        fromColumn: sourceColumnId,
        toColumn: targetColumnId,
      })

      if (!isDoneColumn(sourceColumnId) && isDoneColumn(targetColumnId)) {
        eventBus.emit(WORK_EVENTS.TASK_COMPLETED, {
          taskId: draggedCard.id,
          title: draggedCard.title,
          columnId: targetColumnId,
        })
      }
    }
  }

  const handleAddCard = async (columnId: string) => {
    const title = newCardTitle[columnId]?.trim()
    if (!title) return

    const id = crypto.randomUUID()
    const position = cards.filter((c) => c.columnId === columnId && !c.archived).length

    const card: Card = {
      id,
      columnId,
      title,
      description: '',
      content: '',
      labels: [],
      dueDate: null,
      position,
      priority: null,
      estimateMinutes: null,
      checklist: [],
      archived: false,
      archivedAt: null,
    }

    addCard(card)
    setNewCardTitle((prev) => ({ ...prev, [columnId]: '' }))

    if (window.storage) {
      await window.storage.execute(
        `INSERT INTO work_cards (id, column_id, title, description, content, labels, due_date, position, priority, estimate_minutes, checklist, archived, archived_at)
         VALUES (?, ?, ?, '', '', '[]', NULL, ?, NULL, NULL, '[]', 0, NULL)`,
        [id, columnId, title, position],
      )
    }

    eventBus.emit(WORK_EVENTS.TASK_CREATED, { id, title, columnId })
  }

  const handleDeleteCard = async (id: string) => {
    if (currentFocusSession?.taskId === id) {
      await interruptWorkFocusSession()
    }

    deleteCard(id)
    if (window.storage) {
      await window.storage.execute(`DELETE FROM work_cards WHERE id = ?`, [id])
    }
    eventBus.emit(WORK_EVENTS.TASK_DELETED, { taskId: id })
  }

  const startEditColumn = (col: { id: string; name: string; wipLimit?: number | null }) => {
    setEditingColumnId(col.id)
    setColumnDraft({ name: col.name, wipLimit: col.wipLimit ? String(col.wipLimit) : '' })
  }

  const cancelEditColumn = () => {
    setEditingColumnId(null)
    setColumnDraft({ name: '', wipLimit: '' })
  }

  const saveEditColumn = async () => {
    if (!editingColumnId) return
    const name = columnDraft.name.trim()
    if (!name) return
    const wipRaw = columnDraft.wipLimit.trim()
    const wipLimit = wipRaw === '' ? null : Math.max(0, Number.parseInt(wipRaw, 10) || 0) || null

    setColumns(
      columns.map((c) => (c.id === editingColumnId ? { ...c, name, wipLimit } : c)),
    )
    if (window.storage) {
      await window.storage.execute(
        `UPDATE work_columns SET name = ?, wip_limit = ? WHERE id = ?`,
        [name, wipLimit, editingColumnId],
      )
    }
    cancelEditColumn()
  }

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position)

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="scrollbar-kanban flex gap-4 overflow-x-auto pb-4">
          {sortedColumns.map((col) => {
            const colCards = cards
              .filter((c) => c.columnId === col.id && !c.archived)
              .sort((a, b) => a.position - b.position)

            const overWip = col.wipLimit != null && col.wipLimit > 0 && colCards.length > col.wipLimit

            return (
              <ColumnDropZone
                key={col.id}
                id={col.id}
                className="flex-shrink-0 w-72 rounded-xl border border-border bg-surface-light shadow-lg shadow-black/25 transition-shadow duration-200 hover:shadow-xl hover:shadow-black/35 animate-slide-up"
              >
                {/* Column header (also drop target) */}
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  {editingColumnId === col.id ? (
                    <div className="flex w-full items-center gap-1">
                      <input
                        autoFocus
                        value={columnDraft.name}
                        onChange={(e) => setColumnDraft((d) => ({ ...d, name: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditColumn()
                          if (e.key === 'Escape') cancelEditColumn()
                        }}
                        placeholder="Nombre"
                        className="flex-1 rounded border border-border bg-surface px-2 py-1 text-sm focus:border-accent/60 focus:outline-none"
                      />
                      <input
                        type="number"
                        min={0}
                        value={columnDraft.wipLimit}
                        onChange={(e) => setColumnDraft((d) => ({ ...d, wipLimit: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditColumn()
                          if (e.key === 'Escape') cancelEditColumn()
                        }}
                        placeholder="WIP"
                        className="w-14 rounded border border-border bg-surface px-2 py-1 text-xs focus:border-accent/60 focus:outline-none"
                      />
                      <button
                        onClick={saveEditColumn}
                        title="Guardar"
                        className="rounded bg-accent/20 px-2 py-1 text-xs text-accent-light hover:bg-accent/30"
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelEditColumn}
                        title="Cancelar"
                        className="rounded px-2 py-1 text-xs text-muted hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-accent/70 shadow-[0_0_6px_1px_rgba(249,115,22,0.42)]" />
                        <h4 className="text-sm font-semibold">{col.name}</h4>
                        <button
                          type="button"
                          onClick={() => startEditColumn(col)}
                          title="Editar columna"
                          className="text-muted/40 hover:text-accent-light transition-colors"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                          overWip ? 'bg-red-500/20 text-red-300' : 'bg-surface text-muted'
                        }`}
                        title={col.wipLimit ? `Límite WIP: ${col.wipLimit}` : undefined}
                      >
                        {colCards.length}
                        {col.wipLimit ? ` / ${col.wipLimit}` : ''}
                      </span>
                    </>
                  )}
                </div>

                {/* Cards */}
                <SortableContext items={colCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 p-2 min-h-[100px]" id={col.id}>
                    {colCards.map((card) => (
                      <SortableCard
                        key={card.id}
                        card={card}
                        focusSessionCount={focusCountByTask.get(card.id) ?? 0}
                        onDelete={handleDeleteCard}
                        onOpen={setSelectedCard}
                        onStartFocus={(selected) => startWorkFocusSession(selected.id)}
                        onStopFocus={() => interruptWorkFocusSession()}
                        isFocusActive={currentFocusSession?.taskId === card.id}
                      />
                    ))}

                    {colCards.length === 0 && (
                      <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border/40 text-xs text-muted/50">
                        Sin tareas
                      </div>
                    )}
                  </div>
                </SortableContext>

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
              </ColumnDropZone>
            )
          })}
        </div>

        {/* Drag overlay (ghost card) — portalado a body para escapar a ancestros transformados */}
        {createPortal(
          <DragOverlay
            dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}
            style={{ pointerEvents: 'none' }}
          >
            {activeCard && (
              <div className="rounded-lg border border-accent/40 bg-surface p-3 shadow-2xl shadow-black/50 opacity-95 rotate-1 scale-105 cursor-grabbing">
                <p className="text-sm leading-snug">{activeCard.title}</p>
              </div>
            )}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      {/* Card detail modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </>
  )
}
