import { Sparkles } from 'lucide-react'
import { messages } from '../../messages'
import type { FirstActionResult } from './StepFirstAction'

interface SummaryItem {
  label: string
  value: string
}

interface Props {
  name: string
  plugins: { fitness: boolean; work: boolean }
  fitnessGoal?: string
  firstAction?: FirstActionResult | null
  onFinish: () => void
}

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Bajar de peso',
  gain_weight: 'Subir de peso',
  consistency: 'Mantener constancia',
}

function firstActionLabel(action: FirstActionResult | null | undefined): string | null {
  if (!action || action.kind === 'skip') return null
  if (action.kind === 'work_task') return `Tarea creada: "${action.value ?? ''}"`
  if (action.kind === 'fitness_weight') return `Peso registrado: ${action.value} kg`
  return null
}

export function StepSummary({ name, plugins, fitnessGoal, firstAction, onFinish }: Props) {
  const items: SummaryItem[] = [
    { label: 'Nombre', value: name },
    {
      label: 'Módulos activos',
      value: [plugins.fitness && 'Fitness', plugins.work && 'Work']
        .filter(Boolean)
        .join(' · '),
    },
    ...(fitnessGoal ? [{ label: 'Objetivo fitness', value: GOAL_LABELS[fitnessGoal] ?? fitnessGoal }] : []),
  ]
  const actionLine = firstActionLabel(firstAction)
  if (actionLine) {
    items.push({ label: 'Primera acción', value: actionLine })
  }

  return (
    <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
      <div className="space-y-2">
        <div className="flex justify-center">
          <Sparkles size={40} className="text-accent-light" />
        </div>
        <h2 className="text-3xl font-bold">{messages.onboarding.summaryHeading(name)}</h2>
        <p className="text-sm text-muted">{messages.onboarding.summaryHelp}</p>
      </div>

      <div className="w-full max-w-sm bg-surface-light/60 border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between px-5 py-3.5 text-sm gap-3">
            <span className="text-muted flex-shrink-0">{item.label}</span>
            <span className="text-white font-medium text-right truncate">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2 text-center max-w-xs">
        <p className="text-xs text-muted">
          Personal OS guarda todo localmente. Tus datos son solo tuyos.
        </p>
      </div>

      <button
        onClick={onFinish}
        className="rounded-2xl bg-accent hover:bg-accent/80 active:scale-95 transition-all px-12 py-3.5 text-base font-semibold text-white shadow-xl shadow-accent/20"
      >
        {messages.onboarding.finish}
      </button>
    </div>
  )
}
