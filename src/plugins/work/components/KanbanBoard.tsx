import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Plus, Trash2, CheckCircle2 } from 'lucide-react'
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
import { interruptWorkFocusSession, startWorkFocusSession, completeWorkFocusSession, completeWorkTask, stopWorkTask } from '../focus'
import { isDoneColumn as isDoneColumnUtil } from '../utils/columnUtils'
import { SortableCard } from './SortableCard'
import { CardDetailModal } from './CardDetailModal'
import type { Card, Column } from '../types'

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
  const [creatingColumn, setCreatingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')

  // Conteo de sesiones de foco por tarea (solo sesiones finalizadas).
  const focusCountByTask = focusSessions.reduce<Map<string, number>>((acc, session) => {
    if (!session.taskId || !session.endTime) return acc
    acc.set(session.taskId, (acc.get(session.taskId) ?? 0) + 1)
    return acc
  }, new Map())

  const isDoneColumn = (columnId: string) => {
    const col = columns.find((c) => c.id === columnId)
    return col ? isDoneColumnUtil(col) : false
  }

  const isInProgressColumn = (columnId: string) =>
    columnId === 'col-progress' || columns.some((column) => column.id === columnId && /progreso|progress/i.test(column.name))

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
        // Si la card movida está en foco activo, cerrar la sesión como completada.
        if (currentFocusSession?.taskId === draggedCard.id) {
          await completeWorkFocusSession()
        }
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

  const handleAddColumn = async () => {
    const name = newColumnName.trim()
    if (!name) {
      setCreatingColumn(false)
      setNewColumnName('')
      return
    }
    const boardId = columns[0]?.boardId ?? 'default'
    const id = `col-${crypto.randomUUID().slice(0, 8)}`
    const position = columns.filter((c) => c.boardId === boardId).length
    const newCol: Column = { id, boardId, name, position, wipLimit: null, isDone: false }
    setColumns([...columns, newCol])
    if (window.storage) {
      await window.storage.execute(
        `INSERT INTO work_columns (id, board_id, name, position, wip_limit, is_done) VALUES (?, ?, ?, ?, NULL, 0)`,
        [id, boardId, name, position],
      )
    }
    setCreatingColumn(false)
    setNewColumnName('')
  }

  const handleDeleteColumn = async (col: Column) => {
    const sameBoard = columns.filter((c) => c.boardId === col.boardId)
    if (sameBoard.length <= 1) {
      window.alert('No podés eliminar la única columna del tablero.')
      return
    }
    if (isDoneColumnUtil(col)) {
      window.alert('Esta es la columna marcada como Completada. Mové la marca a otra columna antes de eliminarla.')
      return
    }
    const colCards = cards.filter((c) => c.columnId === col.id && !c.archived)
    let fallbackId: string | null = null
    if (colCards.length > 0) {
      const candidates = sameBoard.filter((c) => c.id !== col.id)
      const fallback = candidates.find((c) => !isDoneColumnUtil(c)) ?? candidates[0]
      if (!fallback) return
      const ok = window.confirm(
        `La columna "${col.name}" tiene ${colCards.length} tarjeta(s). Se moverán a "${fallback.name}" antes de eliminar la columna. ¿Continuar?`,
      )
      if (!ok) return
      fallbackId = fallback.id
    } else {
      const ok = window.confirm(`¿Eliminar la columna "${col.name}"?`)
      if (!ok) return
    }

    // Mover tarjetas al fallback si corresponde.
    if (fallbackId) {
      const targetBase = cards.filter((c) => c.columnId === fallbackId && !c.archived).length
      const updates = colCards.map((card, idx) => ({
        id: card.id,
        columnId: fallbackId!,
        position: targetBase + idx,
      }))
      reorderCards(updates)
      if (window.storage) {
        await Promise.all(
          updates.map((u) =>
            window.storage.execute(
              `UPDATE work_cards SET column_id = ?, position = ? WHERE id = ?`,
              [u.columnId, u.position, u.id],
            ),
          ),
        )
      }
    }

    // Recalcular posiciones del board sin la columna eliminada.
    const remaining = columns
      .filter((c) => c.id !== col.id)
      .sort((a, b) => a.position - b.position)
      .map((c, idx) => (c.boardId === col.boardId ? { ...c, position: idx } : c))

    setColumns(remaining)
    if (window.storage) {
      await window.storage.execute(`DELETE FROM work_columns WHERE id = ?`, [col.id])
      await Promise.all(
        remaining
          .filter((c) => c.boardId === col.boardId)
          .map((c) =>
            window.storage.execute(`UPDATE work_columns SET position = ? WHERE id = ?`, [c.position, c.id]),
          ),
      )
    }

    // Si la card en foco fue movida, no es necesario interrumpir (sigue en otra columna).
  }

  const handleToggleDoneColumn = async (col: Column) => {
    const sameBoard = columns.filter((c) => c.boardId === col.boardId)
    const currentDone = sameBoard.find((c) => c.isDone)
    if (currentDone?.id === col.id) {
      window.alert('Cada tablero requiere una columna Completada. Marcá otra columna como Completada antes de quitar esta.')
      return
    }
    setColumns(
      columns.map((c) => {
        if (c.boardId !== col.boardId) return c
        return { ...c, isDone: c.id === col.id }
      }),
    )
    if (window.storage) {
      await window.storage.execute(
        `UPDATE work_columns SET is_done = 0 WHERE board_id = ?`,
        [col.boardId],
      )
      await window.storage.execute(
        `UPDATE work_columns SET is_done = 1 WHERE id = ?`,
        [col.id],
      )
    }
  }

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position)
  // Hasta 4 columnas: reparten ancho equitativo y no scrollean.
  // 5 o más: ancho fijo + scroll horizontal del tablero.
  const fitsWithoutScroll = sortedColumns.length <= 4
  const trackClass = fitsWithoutScroll
    ? 'flex gap-4 pb-4'
    : 'scrollbar-kanban flex gap-4 overflow-x-auto pb-4'
  const columnSizingClass = fitsWithoutScroll
    ? 'flex-1 min-w-0'
    : 'flex-shrink-0 w-64'

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={trackClass}>
          {sortedColumns.map((col) => {
            const colCards = cards
              .filter((c) => c.columnId === col.id && !c.archived)
              .sort((a, b) => a.position - b.position)

            const overWip = col.wipLimit != null && col.wipLimit > 0 && colCards.length > col.wipLimit
            const isDone = isDoneColumnUtil(col)

            return (
              <ColumnDropZone
                key={col.id}
                id={col.id}
                className={`${columnSizingClass} rounded-xl border ${isDone ? 'border-success/40' : 'border-border'} bg-surface-light shadow-lg shadow-black/25 transition-shadow duration-200 hover:shadow-xl hover:shadow-black/35 animate-slide-up`}
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
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-2 w-2 rounded-full ${isDone ? 'bg-success/80 shadow-[0_0_6px_1px_rgba(34,197,94,0.45)]' : 'bg-accent/70 shadow-[0_0_6px_1px_rgba(249,115,22,0.42)]'}`} />
                        <h4 className="text-sm font-semibold truncate">{col.name}</h4>
                        {isDone && (
                          <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success" title="Columna marcada como Completada">
                            Done
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditColumn(col)}
                          title="Editar columna"
                          className="text-muted/40 hover:text-accent-light transition-colors"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleDoneColumn(col)}
                          title={isDone ? 'Esta es la columna Completada' : 'Marcar como columna Completada'}
                          className={`transition-colors ${isDone ? 'text-success' : 'text-muted/40 hover:text-success'}`}
                        >
                          <CheckCircle2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteColumn(col)}
                          title="Eliminar columna"
                          className="text-muted/40 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={11} />
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
                        onStopFocus={() => { void stopWorkTask(card.id) }}
                        onComplete={isInProgressColumn(col.id) ? (selected) => completeWorkTask(selected.id) : undefined}
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
                      className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1.5 text-sm placeholder:text-muted/50 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                    <button
                      onClick={() => handleAddCard(col.id)}
                      className="flex-shrink-0 rounded bg-accent/20 px-2.5 py-1.5 text-sm font-bold text-accent-light transition-colors hover:bg-accent/35 active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
              </ColumnDropZone>
            )
          })}

          {/* Botón / formulario para añadir nueva columna (placeholder angosto, no compite por ancho) */}
          <div className="flex-shrink-0 w-44 rounded-xl border border-dashed border-border/60 bg-surface/40 p-2 self-start">
            {creatingColumn ? (
              <div className="flex flex-col gap-2 p-2">
                <input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleAddColumn()
                    if (e.key === 'Escape') {
                      setCreatingColumn(false)
                      setNewColumnName('')
                    }
                  }}
                  placeholder="Nombre de la columna"
                  className="rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-accent/60 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleAddColumn()}
                    className="flex-1 rounded bg-accent/20 px-2 py-1.5 text-xs font-semibold text-accent-light hover:bg-accent/30"
                  >
                    Crear
                  </button>
                  <button
                    onClick={() => {
                      setCreatingColumn(false)
                      setNewColumnName('')
                    }}
                    className="rounded px-2 py-1.5 text-xs text-muted hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreatingColumn(true)}
                className="flex h-full min-h-[120px] w-full items-center justify-center gap-2 rounded-lg text-sm text-muted/70 transition-colors hover:bg-surface hover:text-white"
              >
                <Plus size={14} /> Nueva columna
              </button>
            )}
          </div>
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
