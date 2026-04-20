import { useFitnessStore } from '../store'
import { getCurrentWeight, getMealCompliancePercent, countWorkoutsMonth, averageField } from '../utils'
import { Target, Utensils, Dumbbell, Ban, Moon } from 'lucide-react'

export function KpiCards() {
  const entries = useFitnessStore((s) => s.entries)
  const currentWeight = getCurrentWeight(entries)
  const mealPct = getMealCompliancePercent(entries)
  const workouts = countWorkoutsMonth(entries)
  const avgCigs = averageField(entries, 'cigarettes', 7)
  const avgSleep = averageField(entries, 'sleep', 7)

  const cards = [
    { label: 'Peso Actual', value: currentWeight ? `${currentWeight} kg` : '—', icon: Target, color: 'text-purple-400' },
    { label: 'Comidas (30d)', value: `${mealPct}%`, icon: Utensils, color: 'text-green-400' },
    { label: 'Entrenos (mes)', value: String(workouts), icon: Dumbbell, color: 'text-blue-400' },
    { label: 'Cigarrillos/día', value: String(avgCigs), icon: Ban, color: 'text-red-400' },
    { label: 'Sueño promedio', value: `${avgSleep}h`, icon: Moon, color: 'text-indigo-400' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-surface-light rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <c.icon size={16} className={c.color} />
            <span className="text-xs text-muted">{c.label}</span>
          </div>
          <p className="text-xl font-bold">{c.value}</p>
        </div>
      ))}
    </div>
  )
}
