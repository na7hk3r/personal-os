import { useWorkStore } from '../store'
import { KanbanBoard } from '../components/KanbanBoard'

export function WorkDashboard() {
  const { boards, cards, notes } = useWorkStore()
  const totalCards = cards.length
  const totalNotes = notes.length

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-light rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1">📋 Tableros</p>
          <p className="text-2xl font-bold">{boards.length}</p>
        </div>
        <div className="bg-surface-light rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1">🗂️ Tareas</p>
          <p className="text-2xl font-bold">{totalCards}</p>
        </div>
        <div className="bg-surface-light rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1">📝 Notas</p>
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
