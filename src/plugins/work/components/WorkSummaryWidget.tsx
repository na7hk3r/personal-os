import { useWorkStore } from '../store'

export function WorkSummaryWidget() {
  const { cards } = useWorkStore()
  return (
    <div className="text-center">
      <p className="text-2xl font-bold">{cards.length}</p>
      <p className="text-xs text-muted">tareas activas</p>
    </div>
  )
}
