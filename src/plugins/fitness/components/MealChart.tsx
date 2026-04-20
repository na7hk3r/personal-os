import { useFitnessStore } from '../store'
import { getMealChartData } from '../utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const CHART_STYLE = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  tooltipBg: 'var(--chart-tooltip-bg)',
  tooltipBorder: 'var(--chart-tooltip-border)',
  mealGood: 'var(--chart-meal-good)',
  mealWarn: 'var(--chart-meal-warn)',
  mealBad: 'var(--chart-meal-bad)',
}

export function MealChart() {
  const entries = useFitnessStore((s) => s.entries)
  const data = getMealChartData(entries, 14)

  if (data.length === 0) {
    return <p className="text-sm text-muted">Sin datos de comidas aún.</p>
  }

  const getColor = (meals: number) => {
    if (meals === 4) return CHART_STYLE.mealGood
    if (meals === 3) return CHART_STYLE.mealWarn
    return CHART_STYLE.mealBad
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} />
        <XAxis dataKey="date" stroke={CHART_STYLE.axis} fontSize={12} />
        <YAxis stroke={CHART_STYLE.axis} fontSize={12} domain={[0, 4]} />
        <Tooltip
          contentStyle={{ backgroundColor: CHART_STYLE.tooltipBg, border: `1px solid ${CHART_STYLE.tooltipBorder}` }}
          labelStyle={{ color: CHART_STYLE.axis }}
        />
        <Bar dataKey="meals" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={getColor(entry.meals)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
