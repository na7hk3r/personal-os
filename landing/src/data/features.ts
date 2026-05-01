import type { LucideIcon } from 'lucide-react'
import { Sunrise, LayoutGrid, Lock, Bot, Trophy, Sliders } from 'lucide-react'

export interface Feature {
  title: string
  description: string
  icon: LucideIcon
}

export const features: Feature[] = [
  {
    title: 'Sabés qué hacer cada mañana',
    description:
      'El copiloto analiza tus datos y te da un plan accionable al abrir la app. Sin decidir vos.',
    icon: Sunrise,
  },
  {
    title: 'Todo en un lugar',
    description:
      'Trabajo, salud, hábitos, finanzas y journal. Sin pagar diez SaaS distintos.',
    icon: LayoutGrid,
  },
  {
    title: 'Tus datos son tuyos',
    description:
      'SQLite en tu disco. Sin cuenta, sin nube, sin telemetría. Ni siquiera nosotros podemos verlos.',
    icon: Lock,
  },
  {
    title: 'IA que no espía',
    description:
      'Ollama corre en tu máquina. El modelo nunca sale de tu equipo. Privacidad real, no marketing.',
    icon: Bot,
  },
  {
    title: 'Gamificado, no infantil',
    description:
      'XP real conectado a tus acciones. Rachas, logros y misiones diarias con consecuencias reales.',
    icon: Trophy,
  },
  {
    title: 'Se adapta a lo que usás',
    description:
      'Activás solo los módulos que necesitás. La app no te impone estructura.',
    icon: Sliders,
  },
]
