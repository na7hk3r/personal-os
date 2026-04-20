import { useFitnessStore } from '../store'

export function DailyTable() {
  const entries = useFitnessStore((s) => s.entries)
  const recent = [...entries].reverse().slice(0, 10)

  if (recent.length === 0) {
    return <p className="text-sm text-muted">No hay registros aún.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted text-left">
            <th className="py-2 px-2">Fecha</th>
            <th className="py-2 px-2">Peso</th>
            <th className="py-2 px-2">Comidas</th>
            <th className="py-2 px-2">Entreno</th>
            <th className="py-2 px-2">Cig.</th>
            <th className="py-2 px-2">Sueño</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((e) => (
            <tr key={e.date} className="border-b border-border/50">
              <td className="py-1.5 px-2">{e.date.slice(5)}</td>
              <td className="py-1.5 px-2">{e.weight ?? '—'}</td>
              <td className="py-1.5 px-2">{e.breakfast + e.lunch + e.snack + e.dinner}/4</td>
              <td className="py-1.5 px-2">{e.workout || '—'}</td>
              <td className="py-1.5 px-2">{e.cigarettes}</td>
              <td className="py-1.5 px-2">{e.sleep}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
