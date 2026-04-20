import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useFitnessStore } from '../store'
import { getSmokingChartData } from '../utils'

const CHART_STYLE = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  tooltipBg: 'var(--chart-tooltip-bg)',
  tooltipBorder: 'var(--chart-tooltip-border)',
  bar: 'var(--chart-smoking)',
}

export function SmokingChart() {
  const entries = useFitnessStore((s) => s.entries)
  const data = getSmokingChartData(entries)

  if (data.length === 0) {
    return (
      <div className="bg-surface-light rounded-xl border border-border p-6 text-center text-muted text-sm">
        Sin datos de cigarrillos
      </div>
    )
  }

  return (
    <div className="bg-surface-light rounded-xl border border-border p-4">
      <h4 className="text-sm font-semibold mb-4">🚬 Cigarrillos / día</h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_STYLE.axis }} />
          <YAxis tick={{ fontSize: 11, fill: CHART_STYLE.axis }} />
          <Tooltip
            contentStyle={{ background: CHART_STYLE.tooltipBg, border: `1px solid ${CHART_STYLE.tooltipBorder}`, borderRadius: 8 }}
            labelStyle={{ color: CHART_STYLE.axis }}
          />
          <Bar dataKey="cigarettes" fill={CHART_STYLE.bar} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
