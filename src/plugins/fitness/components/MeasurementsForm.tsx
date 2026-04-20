import { useState } from 'react'
import { useFitnessStore } from '../store'
import type { Measurement } from '../types'
import { Ruler } from 'lucide-react'

export function MeasurementsForm() {
  const { addMeasurement } = useFitnessStore()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [fields, setFields] = useState({
    weight: '',
    armRelaxed: '',
    armFlexed: '',
    chest: '',
    waist: '',
    leg: '',
  })

  const set = (key: string, val: string) =>
    setFields((prev) => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const m: Measurement = {
      date,
      weight: parseFloat(fields.weight) || 0,
      armRelaxed: parseFloat(fields.armRelaxed) || 0,
      armFlexed: parseFloat(fields.armFlexed) || 0,
      chest: parseFloat(fields.chest) || 0,
      waist: parseFloat(fields.waist) || 0,
      leg: parseFloat(fields.leg) || 0,
    }

    addMeasurement(m)

    await window.storage.execute(
      `INSERT OR REPLACE INTO fitness_measurements (date, weight, arm_relaxed, arm_flexed, chest, waist, leg)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [m.date, m.weight, m.armRelaxed, m.armFlexed, m.chest, m.waist, m.leg],
    )

    setFields({ weight: '', armRelaxed: '', armFlexed: '', chest: '', waist: '', leg: '' })
  }

  const inputCls = 'bg-surface border border-border rounded px-3 py-2 text-sm w-full'

  return (
    <form onSubmit={handleSubmit} className="bg-surface-light rounded-xl border border-border p-4">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Ruler size={16} />
        Registro de Medidas
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted">Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-muted">Peso (kg)</label>
          <input type="number" step="0.1" value={fields.weight} onChange={(e) => set('weight', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-muted">Brazo relajado (cm)</label>
          <input type="number" step="0.1" value={fields.armRelaxed} onChange={(e) => set('armRelaxed', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-muted">Brazo flexionado (cm)</label>
          <input type="number" step="0.1" value={fields.armFlexed} onChange={(e) => set('armFlexed', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-muted">Pecho (cm)</label>
          <input type="number" step="0.1" value={fields.chest} onChange={(e) => set('chest', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-muted">Cintura (cm)</label>
          <input type="number" step="0.1" value={fields.waist} onChange={(e) => set('waist', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-muted">Pierna (cm)</label>
          <input type="number" step="0.1" value={fields.leg} onChange={(e) => set('leg', e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-light"
          >
            Guardar
          </button>
        </div>
      </div>
    </form>
  )
}
