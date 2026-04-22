import { useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { useFitnessStore } from '../store'
import { FITNESS_EVENTS } from '../events'
import { eventBus } from '@core/events/EventBus'
import type { DailyEntry } from '../types'

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function DailyEntry() {
  const { entries, addEntry, updateEntry } = useFitnessStore()
  const [currentDate, setCurrentDate] = useState(new Date())

  const dateStr = format(currentDate, 'yyyy-MM-dd')
  const dayName = DAYS[currentDate.getDay()]
  const existing = entries.find((e) => e.date === dateStr)

  const [form, setForm] = useState({
    breakfast: existing?.breakfast ?? 0,
    lunch: existing?.lunch ?? 0,
    snack: existing?.snack ?? 0,
    dinner: existing?.dinner ?? 0,
    workout: existing?.workout ?? '',
    cigarettes: existing?.cigarettes ?? 0,
    sleep: existing?.sleep ?? 0,
    weight: existing?.weight ?? null,
    notes: existing?.notes ?? '',
  })

  const toggleMeal = (field: 'breakfast' | 'lunch' | 'snack' | 'dinner') => {
    setForm((prev) => ({ ...prev, [field]: prev[field] ? 0 : 1 }))
  }

  const handleSave = async () => {
    const entry: DailyEntry = {
      date: dateStr,
      dayName,
      ...form,
      breakfast: form.breakfast as 0 | 1,
      lunch: form.lunch as 0 | 1,
      snack: form.snack as 0 | 1,
      dinner: form.dinner as 0 | 1,
      workout: form.workout as DailyEntry['workout'],
    }

    if (existing) {
      updateEntry(dateStr, entry)
    } else {
      addEntry(entry)
    }

    // Persist via storage
    const cols = 'date, day_name, weight, breakfast, lunch, snack, dinner, workout, cigarettes, sleep, notes'
    const placeholders = '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?'
    const values = [
      entry.date, entry.dayName, entry.weight,
      entry.breakfast, entry.lunch, entry.snack, entry.dinner,
      entry.workout, entry.cigarettes, entry.sleep, entry.notes,
    ]

    await window.storage.execute(
      `INSERT OR REPLACE INTO fitness_daily_entries (${cols}) VALUES (${placeholders})`,
      values,
    )

    eventBus.emit(FITNESS_EVENTS.DAILY_ENTRY_SAVED, entry)
    if (entry.weight) eventBus.emit(FITNESS_EVENTS.WEIGHT_RECORDED, { weight: entry.weight, date: dateStr })
    if (entry.workout === 'A' || entry.workout === 'B') {
      eventBus.emit(FITNESS_EVENTS.WORKOUT_COMPLETED, { type: entry.workout, date: dateStr })
    }
  }

  return (
    <div className="bg-surface-light rounded-xl border border-border p-5 space-y-4">
      <h3 className="text-lg font-semibold">Registro Diario</h3>

      {/* Date nav */}
      <div className="flex items-center gap-3">
        <button onClick={() => setCurrentDate((d) => subDays(d, 1))} className="px-2 py-1 bg-surface rounded hover:bg-surface-lighter">←</button>
        <span className="text-sm font-medium">{format(currentDate, "EEEE d 'de' MMMM", { locale: es })}</span>
        <button onClick={() => setCurrentDate((d) => addDays(d, 1))} className="px-2 py-1 bg-surface rounded hover:bg-surface-lighter">→</button>
      </div>

      {/* Meals */}
      <div>
        <p className="text-xs text-muted mb-2">Comidas</p>
        <div className="flex gap-2">
          {(['breakfast', 'lunch', 'snack', 'dinner'] as const).map((meal) => (
            <button
              key={meal}
              onClick={() => toggleMeal(meal)}
              className={`px-3 py-1.5 rounded text-sm ${
                form[meal] ? 'bg-success text-white' : 'bg-surface text-muted'
              }`}
            >
              {meal === 'breakfast' ? 'Desayuno' : meal === 'lunch' ? 'Almuerzo' : meal === 'snack' ? 'Merienda' : 'Cena'}
            </button>
          ))}
        </div>
      </div>

      {/* Workout */}
      <div>
        <p className="text-xs text-muted mb-2">Entreno</p>
        <div className="flex gap-2">
          {(['A', 'B', 'R'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setForm((p) => ({ ...p, workout: opt }))}
              className={`px-3 py-1.5 rounded text-sm ${
                form.workout === opt ? 'bg-accent text-white' : 'bg-surface text-muted'
              }`}
            >
              {opt === 'R' ? 'Descanso' : `Día ${opt}`}
            </button>
          ))}
        </div>
      </div>

      {/* Numeric fields */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted">Cigarrillos</label>
          <input
            type="number"
            min={0}
            value={form.cigarettes}
            onChange={(e) => setForm((p) => ({ ...p, cigarettes: Number(e.target.value) }))}
            className="w-full mt-1 bg-surface border border-border rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted">Sueño (h)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={form.sleep}
            onChange={(e) => setForm((p) => ({ ...p, sleep: Number(e.target.value) }))}
            className="w-full mt-1 bg-surface border border-border rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted">Peso (kg)</label>
          <input
            type="number"
            step={0.1}
            value={form.weight ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value ? Number(e.target.value) : null }))}
            className="w-full mt-1 bg-surface border border-border rounded px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-muted">Notas</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          className="w-full mt-1 bg-surface border border-border rounded px-3 py-2 text-sm h-16 resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-accent hover:bg-accent/80 text-white rounded-lg py-2 text-sm font-medium transition-colors"
      >
        Guardar
      </button>
    </div>
  )
}
