import type { LucideIcon } from 'lucide-react'
import { Wallet, Dumbbell, Briefcase, Repeat, BookOpen } from 'lucide-react'

export type PluginDomain =
  | 'finance'
  | 'fitness'
  | 'productivity'
  | 'habits'
  | 'knowledge'
  | 'health'

export interface PluginCard {
  id: string
  name: string
  description: string
  domain: PluginDomain
  icon: LucideIcon
  /** Color de acento del card; usa CSS color o gradient. */
  accent: string
  /** Texto humano del dominio. */
  domainLabel: string
}

export const plugins: PluginCard[] = [
  {
    id: 'work',
    name: 'Work',
    description:
      'Kanban con prioridades, vencimientos, WIP limit y Focus Engine 2.0 con Pomodoro nativo. Notas y enlaces con búsqueda.',
    domain: 'productivity',
    domainLabel: 'Productividad',
    icon: Briefcase,
    accent: 'from-indigo-500/30 to-purple-500/10',
  },
  {
    id: 'fitness',
    name: 'Fitness',
    description:
      'Tracking diario de peso, comidas, ejercicios, sueño y cigarrillos. Medidas corporales y resúmenes mensuales.',
    domain: 'fitness',
    domainLabel: 'Fitness',
    icon: Dumbbell,
    accent: 'from-emerald-500/30 to-teal-500/10',
  },
  {
    id: 'finance',
    name: 'Finanzas',
    description:
      'Cuentas, transacciones, presupuestos y gastos recurrentes con motor RRULE. Insights IA opcionales en moneda local.',
    domain: 'finance',
    domainLabel: 'Finanzas',
    icon: Wallet,
    accent: 'from-amber-500/30 to-orange-500/10',
  },
  {
    id: 'habits',
    name: 'Hábitos',
    description:
      'Hábitos diarios, semanales y mensuales con racha, heatmap, detección de "en riesgo" y proveedor IA con top streaks.',
    domain: 'habits',
    domainLabel: 'Hábitos',
    icon: Repeat,
    accent: 'from-rose-500/30 to-pink-500/10',
  },
  {
    id: 'journal',
    name: 'Journal',
    description:
      'Diario con prompts, mood (1–5), tags, búsqueda y pin. Una entrada por día, undo en borrado. Privacy-first.',
    domain: 'knowledge',
    domainLabel: 'Conocimiento',
    icon: BookOpen,
    accent: 'from-sky-500/30 to-blue-500/10',
  },
]
