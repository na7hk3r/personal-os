import { useEffect, useMemo, useState } from 'react'
import { Plus, Power, Trash2, Zap } from 'lucide-react'
import { automationsService, type ActionType, type Automation } from '@core/services/automationsService'
import { CORE_EVENTS } from '@core/events/events'

const ACTION_TYPES: ActionType[] = ['notify', 'add_xp', 'emit_event', 'log']

const KNOWN_EVENTS: string[] = Array.from(new Set([
  ...Object.values(CORE_EVENTS),
  'WORK_TASK_COMPLETED', 'TASK_COMPLETED',
  'WORK_FOCUS_STARTED', 'WORK_FOCUS_COMPLETED',
  'FITNESS_DAY_LOGGED', 'FITNESS_WORKOUT_COMPLETED',
])).sort()

export function AutomationsSection() {
  const [items, setItems] = useState<Automation[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [triggerEvent, setTriggerEvent] = useState(KNOWN_EVENTS[0] ?? 'CORE_PROFILE_UPDATED')
  const [condition, setCondition] = useState('')
  const [actionType, setActionType] = useState<ActionType>('notify')
  const [actionPayloadStr, setActionPayloadStr] = useState('{"title":"Recordatorio"}')
  const [error, setError] = useState('')

  const refresh = () => { void automationsService.list().then(setItems) }
  useEffect(() => { refresh() }, [])

  const placeholder = useMemo(() => {
    switch (actionType) {
      case 'notify': return '{"title":"Foco completado","body":"Buen trabajo"}'
      case 'add_xp': return '{"amount":25,"reason":"automation"}'
      case 'emit_event': return '{"event":"CUSTOM_EVENT","payload":{}}'
      case 'log': return '{"message":"check"}'
    }
  }, [actionType])

  const submit = async () => {
    setError('')
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(actionPayloadStr) as Record<string, unknown> }
    catch { setError('Payload no es JSON válido'); return }
    try {
      await automationsService.create({
        name, triggerEvent, condition: condition || null, actionType, actionPayload: parsed,
      })
      setShowForm(false); setName(''); setCondition(''); setActionPayloadStr('{}')
      refresh()
    } catch (err) { setError((err as Error).message) }
  }

  return (
    <article className="rounded-2xl border border-border bg-surface-light/85 p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-accent-light" />
          <h2 className="text-lg font-semibold">Automatizaciones</h2>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/85"
        ><Plus size={12} /> Nueva</button>
      </div>
      <p className="mt-1 text-sm text-muted">
        Reaccioná a eventos de Personal OS sin escribir código. Por ejemplo: cuando completás un foco, sumá XP o disparate una notificación.
      </p>

      {showForm && (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface p-4">
          <label className="block space-y-1">
            <span className="text-xs text-muted">Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-muted">Evento trigger</span>
              <input
                list="known-events" value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
              />
              <datalist id="known-events">{KNOWN_EVENTS.map((ev) => <option key={ev} value={ev} />)}</datalist>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Acción</span>
              <select value={actionType} onChange={(e) => setActionType(e.target.value as ActionType)} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm">
                {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Condición (opcional, JS-like sobre payload). Ej: <code>amount {'>'} 10</code></span>
            <input value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Payload (JSON)</span>
            <textarea
              value={actionPayloadStr} onChange={(e) => setActionPayloadStr(e.target.value)}
              rows={3} placeholder={placeholder}
              className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 font-mono text-xs"
            />
          </label>
          {error && <p className="text-xs text-warning">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => void submit()} className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85">Crear</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-xs text-muted hover:text-white">Cancelar</button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted">Aún no hay automatizaciones. Creá la primera con el botón &quot;Nueva&quot;.</p>
        ) : items.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{a.name}</p>
              <p className="truncate text-[11px] text-muted">
                {a.trigger_event} → {a.action_type} · ejecutada {a.run_count}x
                {a.last_run_at && ` · última ${a.last_run_at}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => void automationsService.toggle(a.id, !a.enabled).then(refresh)}
                title={a.enabled ? 'Desactivar' : 'Activar'}
                className={`rounded p-1.5 ${a.enabled ? 'text-emerald-300' : 'text-muted'} hover:bg-surface-light`}
              ><Power size={14} /></button>
              <button
                onClick={() => { if (window.confirm('¿Eliminar automatización?')) void automationsService.remove(a.id).then(refresh) }}
                className="rounded p-1.5 text-muted hover:bg-surface-light hover:text-warning"
              ><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
