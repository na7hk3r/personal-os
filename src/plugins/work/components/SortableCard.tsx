import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../types'
import { FileText, Pause, Play } from 'lucide-react'

interface Props {
  card: Card
  onDelete: (id: string) => void
  onOpen: (card: Card) => void
  onStartFocus: (card: Card) => void
  onStopFocus: () => void
  isFocusActive: boolean
}

export function SortableCard({ card, onDelete, onOpen, onStartFocus, onStopFocus, isFocusActive }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group rounded-lg border border-border/50 bg-surface p-3 animate-fade-in select-none touch-none"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('[data-delete], [data-focus]')) {
          onOpen(card)
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm leading-snug">{card.title}</p>
        <button
          data-delete="true"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(card.id)
          }}
          className="mt-0.5 flex-shrink-0 rounded p-0.5 text-xs text-muted opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-400"
        >
          ✕
        </button>
      </div>
      {card.description && (
        <p className="mt-1 truncate text-xs text-muted">{card.description}</p>
      )}
      {card.content && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted/60">
          <FileText size={12} />
          <span className="truncate">{card.content.slice(0, 40)}</span>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`text-[10px] uppercase tracking-[0.16em] ${isFocusActive ? 'text-success' : 'text-muted/40'}`}>
          {isFocusActive ? 'En foco' : 'Listo para foco'}
        </span>
        <button
          type="button"
          data-focus="true"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            if (isFocusActive) {
              onStopFocus()
              return
            }
            onStartFocus(card)
          }}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            isFocusActive
              ? 'bg-warning/15 text-warning hover:bg-warning/25'
              : 'bg-accent/15 text-accent-light hover:bg-accent/25'
          }`}
        >
          {isFocusActive ? <Pause size={12} /> : <Play size={12} />}
          {isFocusActive ? 'Pause' : 'Start Focus'}
        </button>
      </div>
    </div>
  )
}
