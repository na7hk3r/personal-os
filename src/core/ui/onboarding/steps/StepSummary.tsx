import { Sparkles } from 'lucide-react'

interface SummaryItem {
  label: string
  value: string
}

interface Props {
  name: string
  plugins: { fitness: boolean; work: boolean }
  fitnessGoal?: string
  onFinish: () => void
}

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Bajar de peso',
  gain_weight: 'Subir de peso',
  consistency: 'Mantener constancia',
}

export function StepSummary({ name, plugins, fitnessGoal, onFinish }: Props) {
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

  return (
    <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
      <div className="space-y-2">
        <div className="flex justify-center">
          <Sparkles size={40} className="text-accent-light" />
        </div>
        <h2 className="text-3xl font-bold">¡Todo listo, {name}!</h2>
        <p className="text-sm text-muted">
          Esto es lo que configuraste. Podés cambiar cualquier cosa después.
        </p>
      </div>

      <div className="w-full max-w-sm bg-surface-light/60 border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="text-muted">{item.label}</span>
            <span className="text-white font-medium">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2 text-center max-w-xs">
        <p className="text-xs text-muted">
          Personal OS guarda todo localmente — tus datos son solo tuyos.
        </p>
      </div>

      <button
        onClick={onFinish}
        className="rounded-2xl bg-accent hover:bg-accent/80 active:scale-95 transition-all px-12 py-3.5 text-base font-semibold text-white shadow-xl shadow-accent/20"
      >
        Entrar al sistema ✦
      </button>
    </div>
  )
}
