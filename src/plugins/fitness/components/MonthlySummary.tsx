import { useFitnessStore } from '../store'
import { getMealCompliancePercent, countWorkoutsMonth, averageField } from '../utils'
import { BarChart3 } from 'lucide-react'

export function MonthlySummary() {
  const entries = useFitnessStore((s) => s.entries)

  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const monthEntries = entries.filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() === month && d.getFullYear() === year
  })

  const mealPct = getMealCompliancePercent(entries)
  const workouts = countWorkoutsMonth(entries)
  const avgSleep = averageField(monthEntries.slice(-30), 'sleep')
  const avgCigs = averageField(monthEntries.slice(-30), 'cigarettes')
  const totalDays = monthEntries.length

  const monthName = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-surface-light rounded-xl border border-border p-4">
      <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <BarChart3 size={16} />
        Resumen - {monthName}
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Días registrados" value={totalDays} />
        <Stat label="Cumplimiento comidas" value={`${mealPct}%`} />
        <Stat label="Entrenos del mes" value={workouts} />
        <Stat label="Promedio sueño" value={`${avgSleep.toFixed(1)}h`} />
        <Stat label="Promedio cigarrillos" value={avgCigs.toFixed(1)} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}
