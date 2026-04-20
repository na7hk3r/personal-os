import { KpiCards } from '../components/KpiCards'
import { WeightChart } from '../components/WeightChart'
import { MealChart } from '../components/MealChart'
import { SmokingChart } from '../components/SmokingChart'
import { MonthlySummary } from '../components/MonthlySummary'

export function FitnessDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🏋️ Fitness</h1>
      <KpiCards />
      <MonthlySummary />
      <div className="bg-surface-light rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium text-muted mb-3">Evolución de Peso</h3>
        <WeightChart />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-light rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium text-muted mb-3">Comidas (14 días)</h3>
          <MealChart />
        </div>
        <SmokingChart />
      </div>
    </div>
  )
}
