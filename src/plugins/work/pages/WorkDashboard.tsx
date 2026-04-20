import { useWorkStore } from '../store'
import { KanbanBoard } from '../components/KanbanBoard'
import { ClipboardList, ListChecks, NotebookPen } from 'lucide-react'

export function WorkDashboard() {
  const { boards, cards, notes } = useWorkStore()
  const totalCards = cards.length
  const totalNotes = notes.length

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-light rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <ClipboardList size={14} />
            Tableros
          </p>
          <p className="text-2xl font-bold">{boards.length}</p>
        </div>
        <div className="bg-surface-light rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <ListChecks size={14} />
            Tareas
          </p>
          <p className="text-2xl font-bold">{totalCards}</p>
        </div>
        <div className="bg-surface-light rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <NotebookPen size={14} />
            Notas
          </p>
          <p className="text-2xl font-bold">{totalNotes}</p>
        </div>
      </div>

      {/* Default board */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Tablero principal</h3>
        <KanbanBoard />
      </div>
    </div>
  )
}
