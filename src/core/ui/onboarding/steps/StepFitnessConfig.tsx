import { useState } from 'react'
import { Cigarette, Target, TrendingDown, TrendingUp } from 'lucide-react'

export interface FitnessConfig {
  goal: 'lose_weight' | 'gain_weight' | 'consistency'
  smokingTracker: boolean
  currentWeight: string
  weightGoal: string
}

interface Props {
  initial: FitnessConfig
  onNext: (config: FitnessConfig) => void
}

const GOALS = [
  { id: 'lose_weight' as const, label: 'Bajar de peso', icon: TrendingDown },
  { id: 'gain_weight' as const, label: 'Subir de peso', icon: TrendingUp },
  { id: 'consistency' as const, label: 'Mantener constancia', icon: Target },
]

export function StepFitnessConfig({ initial, onNext }: Props) {
  const [config, setConfig] = useState<FitnessConfig>(initial)

  return (
    <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-muted">Paso 3 de 3 · Fitness</p>
        <h2 className="text-3xl font-bold">Configurá tu módulo de salud</h2>
        <p className="text-sm text-muted">Para personalizar tu experiencia.</p>
      </div>

      <div className="w-full max-w-md space-y-5 text-left">
        {/* Goal */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted px-1">¿Cuál es tu objetivo principal?</p>
          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <button
                key={g.id}
                onClick={() => setConfig((c) => ({ ...c, goal: g.id }))}
                className={`rounded-xl border p-3 text-center transition-all ${
                  config.goal === g.id
                    ? 'border-accent/60 bg-accent/10 text-white'
                    : 'border-border bg-surface-light/40 text-muted hover:border-border/80 hover:text-white'
                }`}
              >
                <p className="flex justify-center">
                  <g.icon size={22} />
                </p>
                <p className="mt-1 text-xs font-medium leading-snug">{g.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Weight inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted px-1">Peso actual (kg)</label>
            <input
              type="number"
              value={config.currentWeight}
              onChange={(e) => setConfig((c) => ({ ...c, currentWeight: e.target.value }))}
              placeholder="70"
              className="w-full rounded-xl border border-border bg-surface/80 px-4 py-2.5 text-sm placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted px-1">Peso objetivo (kg)</label>
            <input
              type="number"
              value={config.weightGoal}
              onChange={(e) => setConfig((c) => ({ ...c, weightGoal: e.target.value }))}
              placeholder="65"
              className="w-full rounded-xl border border-border bg-surface/80 px-4 py-2.5 text-sm placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20"
            />
          </div>
        </div>

        {/* Smoking tracker */}
        <button
          onClick={() => setConfig((c) => ({ ...c, smokingTracker: !c.smokingTracker }))}
          className={`w-full flex items-center justify-between rounded-xl border p-4 transition-all ${
            config.smokingTracker
              ? 'border-warning/50 bg-warning/5'
              : 'border-border bg-surface-light/40 hover:border-border/80'
          }`}
        >
          <div className="text-left">
            <p className="text-sm font-medium text-white inline-flex items-center gap-1.5">
              <Cigarette size={14} />
              Contador de cigarrillos
            </p>
            <p className="text-xs text-muted mt-0.5">Registrá cuántos fumás por día</p>
          </div>
          <span
            className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
              config.smokingTracker ? 'border-warning bg-warning' : 'border-border'
            }`}
          >
            {config.smokingTracker && <span className="text-[10px] text-black font-bold">✓</span>}
          </span>
        </button>
      </div>

      <button
        onClick={() => onNext(config)}
        className="rounded-2xl bg-accent hover:bg-accent/80 active:scale-95 transition-all px-10 py-3 text-sm font-semibold text-white"
      >
        Continuar →
      </button>
    </div>
  )
}
