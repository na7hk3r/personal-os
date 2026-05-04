// Reformado: window-frame estilizado en torno al ScreenshotTabs, scroll reveal.
import { motion } from 'framer-motion'
import { Section } from '../components/Section'
import { ScreenshotTabs, type ScreenshotTab } from '../components/ScreenshotTabs'

const tabs: ScreenshotTab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    src: 'screenshots/dashboard.png',
    alt: 'Dashboard de Nora OS con Daily Score y misiones',
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
      title="Pensada para usarla todos los días."
      description="Atajos globales, palette de comandos y temas dark/light cuidados al detalle."
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        {/* Glow violeta detrás del frame */}
        <div
          aria-hidden="true"
          className="absolute inset-x-12 top-12 bottom-0 bg-accent/15 blur-3xl rounded-full -z-10"
        />
        <ScreenshotTabs tabs={tabs} />
      </motion.div>
    </Section>
  )
}
