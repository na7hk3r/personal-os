import { useEffect, useRef, useState } from 'react'
import type { Card } from '../types'
import { useWorkStore } from '../store'
import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from '../events'
import { completeWorkFocusSession, interruptWorkFocusSession, startWorkFocusSession } from '../focus'

interface Props {
  card: Card
  onClose: () => void
}

export function CardDetailModal({ card, onClose }: Props) {
  const { updateCard, deleteCard, currentFocusSession } = useWorkStore()
  const [title, setTitle] = useState(card.title)
  const [content, setContent] = useState(card.content ?? '')
  const [description, setDescription] = useState(card.description ?? '')
  const [saving, setSaving] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const isActiveFocusTask = currentFocusSession?.taskId === card.id

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const save = async () => {
    setSaving(true)
    updateCard(card.id, { title, content, description })
    if (window.storage) {
      await window.storage.execute(
        `UPDATE work_cards SET title = ?, description = ?, content = ? WHERE id = ?`,
        [title, description, content, card.id],
      )
    }
    eventBus.emit(WORK_EVENTS.TASK_UPDATED, { taskId: card.id, title, description })
    setSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    if (isActiveFocusTask) {
      await interruptWorkFocusSession()
    }

    deleteCard(card.id)
    if (window.storage) {
      await window.storage.execute(`DELETE FROM work_cards WHERE id = ?`, [card.id])
    }
    eventBus.emit(WORK_EVENTS.TASK_DELETED, { taskId: card.id })
    onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="text-xs uppercase tracking-widest text-muted">Detalle de tarea</span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-light hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-muted block mb-1.5">Título</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-light/60 px-4 py-2.5 text-sm font-medium text-white placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted block mb-1.5">Descripción breve</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional..."
              className="w-full rounded-xl border border-border bg-surface-light/60 px-4 py-2.5 text-sm text-white/80 placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20"
            />
          </div>

          <div className="rounded-xl border border-border bg-surface-light/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Focus Engine</p>
                <p className="mt-1 text-sm text-white/90">
                  {isActiveFocusTask ? 'Esta tarea está en sesión activa.' : 'Convertí esta tarea en el foco actual.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startWorkFocusSession(card.id)}
                  disabled={isActiveFocusTask}
                  className="rounded-xl border border-accent/30 px-3 py-2 text-xs text-accent-light transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Start Focus
                </button>
                <button
                  onClick={() => interruptWorkFocusSession()}
                  disabled={!isActiveFocusTask}
                  className="rounded-xl border border-warning/30 px-3 py-2 text-xs text-warning transition-colors hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Pause
                </button>
                <button
                  onClick={() => completeWorkFocusSession()}
                  disabled={!isActiveFocusTask}
                  className="rounded-xl border border-success/30 px-3 py-2 text-xs text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Stop
                </button>
              </div>
            </div>
          </div>

          {/* Content (rich text area) */}
          <div>
            <label className="text-xs text-muted block mb-1.5">Notas / Contenido</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribí los detalles, pasos, ideas..."
              rows={8}
              className="w-full rounded-xl border border-border bg-surface-light/60 px-4 py-3 text-sm text-white/80 placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <button
            onClick={handleDelete}
            className="rounded-lg px-3 py-2 text-xs text-danger/80 hover:bg-danger/10 hover:text-danger transition-colors"
          >
            Eliminar tarea
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-white hover:border-border/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving || !title.trim()}
              className="rounded-xl bg-accent hover:bg-accent/80 disabled:opacity-50 active:scale-95 transition-all px-5 py-2 text-sm font-medium text-white"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
