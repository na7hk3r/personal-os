import { useFitnessStore } from '../store'
import { getWeightChartData } from '../utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CHART_STYLE = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  tooltipBg: 'var(--chart-tooltip-bg)',
  tooltipBorder: 'var(--chart-tooltip-border)',
  weightLine: 'var(--chart-weight)',
}

export function WeightChart() {
  const entries = useFitnessStore((s) => s.entries)
  const data = getWeightChartData(entries)

  if (data.length === 0) {
    return <p className="text-sm text-muted">Sin datos de peso aún.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} />
        <XAxis dataKey="date" stroke={CHART_STYLE.axis} fontSize={12} />
        <YAxis stroke={CHART_STYLE.axis} fontSize={12} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ backgroundColor: CHART_STYLE.tooltipBg, border: `1px solid ${CHART_STYLE.tooltipBorder}` }}
          labelStyle={{ color: CHART_STYLE.axis }}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke={CHART_STYLE.weightLine}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
