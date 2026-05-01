import { Section } from '../components/Section'
import { ScreenshotTabs, type ScreenshotTab } from '../components/ScreenshotTabs'

const tabs: ScreenshotTab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    src: 'screenshots/dashboard.png',
    alt: 'Dashboard de Personal OS con Daily Score y misiones',
    caption: 'Daily Score, misiones del día y resumen de hábitos en una sola vista.',
  },
  {
    id: 'copilot',
    label: 'Copiloto',
    src: 'screenshots/copilot.png',
    alt: 'Panel del copiloto IA local',
    caption:
      'Copiloto IA local. Respuestas en lenguaje natural sobre tus datos reales, sin enviar nada a la nube.',
  },
  {
    id: 'themes',
    label: 'Temas',
    src: 'screenshots/themes.png',
    alt: 'Galería de temas dark y light',
    caption: 'Galería de temas: dark y light cuidados al detalle, switch instantáneo.',
  },
  {
    id: 'work',
    label: 'Work',
    src: 'screenshots/work.png',
    alt: 'Plugin Work con kanban y Focus Engine',
    caption: 'Plugin Work: kanban con WIP limit y Focus Engine 2.0 con Pomodoro nativo.',
  },
]

export function Screenshots() {
  return (
    <Section
      id="screenshots"
      eyebrow="Capturas"
      title="Una interfaz pensada para que la uses todos los días"
      description="Atajos globales, palette de comandos y temas dark/light cuidados al detalle."
    >
      <ScreenshotTabs tabs={tabs} />
    </Section>
  )
}
