// Reformado: 3 pasos simples y no técnicos, layout en línea con conector animado y stagger framer-motion.
import { motion } from 'framer-motion'
import { Section } from '../components/Section'
import { Download as DownloadIcon, ToggleRight, Sparkles } from 'lucide-react'

interface Step {
  number: string
  title: string
  description: string
  icon: typeof DownloadIcon
}

const steps: Step[] = [
  {
    number: '01',
    title: 'Descargá e instalá',
    description: 'Sin cuentas. Sin servidores. Bajás el instalador y abrís la app. Listo.',
    icon: DownloadIcon,
  },
  {
    number: '02',
    title: 'Activá lo que necesitás',
    description: 'Elegís entre 8 módulos: trabajo, hábitos, finanzas, sueño. Solo lo que vas a usar.',
    icon: ToggleRight,
  },
  {
    number: '03',
    title: 'Tu vida, organizada',
    description: 'Todo en un lugar. Con un copiloto IA opcional que vive en tu máquina.',
    icon: Sparkles,
  },
]

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="Cómo funciona"
      title="Tres pasos. Diez segundos."
      description="Sin tutorial de 40 minutos. Sin onboarding eterno. Bajás, instalás y empieza a servirte."
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
        />

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          {steps.map(({ number, title, description, icon: Icon }, idx) => (
            <motion.li
              key={number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: idx * 0.12 }}
              className="relative flex flex-col items-center text-center px-2"
            >
              <div className="relative mb-6">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-full bg-accent/20 blur-2xl animate-glow-pulse"
                />
                <div className="w-24 h-24 rounded-full bg-surface border border-border flex items-center justify-center relative shadow-glow-sm">
                  <Icon className="w-8 h-8 text-accent" aria-hidden="true" />
                  <span
                    aria-hidden="true"
                    className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-accent text-white text-xs font-mono font-bold shadow"
                  >
                    {number}
                  </span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
              <p className="text-[1rem] text-muted leading-relaxed max-w-xs">{description}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </Section>
  )
}
