import { useFitnessStore } from '../store'

export function MeasurementsTable() {
  const measurements = useFitnessStore((s) => s.measurements)

  if (measurements.length === 0) {
    return <p className="text-muted text-sm text-center py-6">Sin medidas registradas</p>
  }

  const sorted = [...measurements].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="bg-surface-light rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted text-xs">
            <th className="px-4 py-3 text-left">Fecha</th>
            <th className="px-4 py-3 text-right">Peso</th>
            <th className="px-4 py-3 text-right">Brazo R</th>
            <th className="px-4 py-3 text-right">Brazo F</th>
            <th className="px-4 py-3 text-right">Pecho</th>
            <th className="px-4 py-3 text-right">Cintura</th>
            <th className="px-4 py-3 text-right">Pierna</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr key={m.date} className="border-b border-border/50 hover:bg-surface-lighter">
              <td className="px-4 py-2">{m.date}</td>
              <td className="px-4 py-2 text-right">{m.weight || '-'}</td>
              <td className="px-4 py-2 text-right">{m.armRelaxed || '-'}</td>
              <td className="px-4 py-2 text-right">{m.armFlexed || '-'}</td>
              <td className="px-4 py-2 text-right">{m.chest || '-'}</td>
              <td className="px-4 py-2 text-right">{m.waist || '-'}</td>
              <td className="px-4 py-2 text-right">{m.leg || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
