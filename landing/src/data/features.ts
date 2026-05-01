import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  Trophy,
  Database,
  Radio,
  ShieldCheck,
  RefreshCw,
  Laptop,
  Lock,
} from 'lucide-react'

export interface Feature {
  title: string
  description: string
  icon: LucideIcon
}

export const features: Feature[] = [
  {
    title: 'Modular por plugins',
    description:
      'Activá solo lo que usás. Cada plugin (work, fitness, finance, journal, habits…) es independiente y se instala/desactiva en caliente.',
    icon: Boxes,
  },
  {
    title: 'Gamificación integrada',
    description:
      'Logros, misiones diarias y XP que se conectan a eventos reales de tus plugins. Sin medallas vacías.',
    icon: Trophy,
  },
  {
    title: 'SQLite local',
    description:
      'Tu información vive en tu disco — base SQLite cifrable por usuario, sin nube, sin cuenta requerida.',
    icon: Database,
  },
  {
    title: 'Eventos pub/sub',
    description:
      'EventBus interno: los plugins se comunican y reaccionan entre sí sin conocerse, con persistencia opcional.',
    icon: Radio,
  },
  {
    title: 'Auditor de consistencia',
    description:
      'Detecta plugins huérfanos, íconos incoherentes, notificaciones de plugins inactivos y más — antes de que se rompan.',
    icon: ShieldCheck,
  },
  {
    title: 'Auto-update',
    description:
      'Las nuevas versiones llegan solas desde GitHub Releases. Un clic y reiniciás con la versión nueva.',
    icon: RefreshCw,
  },
  {
    title: 'Multiplataforma',
    description: 'Windows (NSIS + portable), Linux (AppImage / deb) y macOS (dmg). Mismo código, mismos datos.',
    icon: Laptop,
  },
  {
    title: '100 % local & privado',
    description:
      'Sin telemetría, sin tracking, sin servidores. IA opcional vía Ollama corriendo en tu propia máquina.',
    icon: Lock,
  },
]
