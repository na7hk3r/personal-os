import { DailyEntry } from '../components/DailyEntry'
import { DailyTable } from '../components/DailyTable'
import { SquarePen } from 'lucide-react'

export function TrackingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <SquarePen size={22} />
        Registro Fitness
      </h1>
      <DailyEntry />
      <div className="bg-surface-light rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium text-muted mb-3">Últimos registros</h3>
        <DailyTable />
      </div>
    </div>
  )
}
