import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
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
  const { columns, cards, addCard, moveCard, deleteCard, currentFocusSession } = useWorkStore()
  const [newCardTitle, setNewCardTitle] = useState<Record<string, string>>({})
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)

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

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeCard = cards.find((c) => c.id === active.id)
    if (!activeCard) return

    // Check if dragged over a column header (column id)
    const overIsColumn = columns.some((col) => col.id === over.id)
    if (overIsColumn && activeCard.columnId !== over.id) {
      moveCard(String(active.id), String(over.id), 0)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const draggedCard = cards.find((c) => c.id === active.id)
    if (!draggedCard) return

    let targetColumnId = draggedCard.columnId
    let targetPosition = draggedCard.position

    // Determine target column
    const overIsColumn = columns.some((col) => col.id === over.id)
    if (overIsColumn) {
      targetColumnId = String(over.id)
    } else {
      const overCard = cards.find((c) => c.id === over.id)
      if (overCard) {
        targetColumnId = overCard.columnId
        targetPosition = overCard.position
      }
    }

    // Recalculate positions within target column
    const colCards = cards
      .filter((c) => c.columnId === targetColumnId && c.id !== draggedCard.id)
      .sort((a, b) => a.position - b.position)

    // Insert dragged card at position
    const overCard = cards.find((c) => c.id === over.id)
    const insertAt = overCard ? colCards.findIndex((c) => c.id === over.id) : colCards.length
    const newPos = insertAt >= 0 ? insertAt : colCards.length

    // Update store
    moveCard(draggedCard.id, targetColumnId, newPos)

    // Persist to SQLite
    if (window.storage) {
      await window.storage.execute(
        `UPDATE work_cards SET column_id = ?, position = ? WHERE id = ?`,
        [targetColumnId, newPos, draggedCard.id],
      )
      // Update positions of siblings
      for (let i = 0; i < colCards.length; i++) {
        const adjusted = i >= newPos ? i + 1 : i
        await window.storage.execute(
          `UPDATE work_cards SET position = ? WHERE id = ?`,
          [adjusted, colCards[i].id],
        )
      }
    }

    eventBus.emit(WORK_EVENTS.TASK_MOVED, {
      cardId: draggedCard.id,
      fromColumn: draggedCard.columnId,
      toColumn: targetColumnId,
    })

    if (!isDoneColumn(draggedCard.columnId) && isDoneColumn(targetColumnId)) {
      eventBus.emit(WORK_EVENTS.TASK_COMPLETED, {
        taskId: draggedCard.id,
        title: draggedCard.title,
        columnId: targetColumnId,
      })
    }
  }

  const handleAddCard = async (columnId: string) => {
    const title = newCardTitle[columnId]?.trim()
    if (!title) return

    const id = crypto.randomUUID()
    const position = cards.filter((c) => c.columnId === columnId).length

    const card: Card = {
      id,
      columnId,
      title,
      description: '',
      content: '',
      labels: [],
      dueDate: null,
      position,
    }

    addCard(card)
    setNewCardTitle((prev) => ({ ...prev, [columnId]: '' }))

    if (window.storage) {
      await window.storage.execute(
        `INSERT INTO work_cards (id, column_id, title, description, content, labels, due_date, position)
         VALUES (?, ?, ?, '', '', '[]', NULL, ?)`,
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

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position)

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="scrollbar-kanban flex gap-4 overflow-x-auto pb-4">
          {sortedColumns.map((col) => {
            const colCards = cards
              .filter((c) => c.columnId === col.id)
              .sort((a, b) => a.position - b.position)

            return (
              <ColumnDropZone
                key={col.id}
                id={col.id}
                className="flex-shrink-0 w-72 rounded-xl border border-border bg-surface-light shadow-lg shadow-black/25 transition-shadow duration-200 hover:shadow-xl hover:shadow-black/35 animate-slide-up"
              >
                {/* Column header (also drop target) */}
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent/70 shadow-[0_0_6px_1px_rgba(249,115,22,0.42)]" />
                    <h4 className="text-sm font-semibold">{col.name}</h4>
                  </div>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted tabular-nums">
                    {colCards.length}
                  </span>
                </div>

                {/* Cards */}
                <SortableContext items={colCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 p-2 min-h-[100px]" id={col.id}>
                    {colCards.map((card) => (
                      <SortableCard
                        key={card.id}
                        card={card}
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

        {/* Drag overlay (ghost card) */}
        <DragOverlay>
          {activeCard && (
            <div className="rounded-lg border border-accent/40 bg-surface p-3 shadow-2xl shadow-black/50 opacity-95 rotate-1 scale-105">
              <p className="text-sm leading-snug">{activeCard.title}</p>
            </div>
          )}
        </DragOverlay>
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
