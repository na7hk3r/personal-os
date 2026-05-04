// Reformado: accordion FAQ con AnimatePresence + preguntas que anticipan objeciones reales.
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Section } from '../components/Section'

interface Item {
  q: string
  a: string
}

// Preguntas que anticipan objeciones reales del target técnico (privacidad, control, costo).
const items: Item[] = [
  {
    q: '¿Es realmente gratis?',
    a: 'Sí. Open source bajo licencia ISC. Sin tier "Pro", sin freemium, sin paywall escondido. El que quiera puede forkearlo.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Viven en tu máquina, en una base SQLite local. Cifrado AES-256-GCM opcional sobre toda la base. Sin nube, sin servidor, sin telemetría.',
  },
  {
    q: '¿Funciona sin internet?',
    a: 'Al 100%. Solo necesitás internet para descargar la app y, si querés, para recibir auto-updates. Todo lo demás es offline.',
  },
  {
    q: '¿Qué es Ollama y necesito usarlo?',
    a: 'Es un motor de IA local que corre en tu máquina. Es totalmente opcional: la app funciona sin él. Si lo instalás, el copiloto IA se activa automáticamente y nunca manda nada a la nube.',
  },
  {
    q: '¿Está disponible para Mac y Linux?',
    a: 'Windows está estable hoy (instalador y portable). Mac (.dmg) y Linux (AppImage / .deb) están en la página de releases — soporte oficial completo en próximas versiones.',
  },
  {
    q: '¿Puedo crear mis propios plugins?',
    a: 'Sí. Hay un CLI de scaffolding (npm run create-plugin -- mi-plugin) y documentación completa de la CoreAPI. Cada plugin es un módulo TypeScript con manifest, eventos, repo y UI.',
  },
]

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <Section
      id="faq"
      eyebrow="Preguntas frecuentes"
      title="Lo que vas a preguntarte."
      description="Anticipamos las dudas más reales — sin marketing fluff."
    >
      <div className="max-w-3xl mx-auto space-y-3">
        {items.map((it, idx) => {
          const isOpen = openIdx === idx
          const triggerId = `faq-trigger-${idx}`
          const panelId = `faq-panel-${idx}`
          return (
            <motion.div
              key={it.q}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className={`rounded-xl border bg-surface/60 backdrop-blur overflow-hidden transition-colors ${
                isOpen ? 'border-accent/50 shadow-glow-sm' : 'border-border hover:border-accent/40'
              }`}
            >
              <h3 className="m-0">
                <button
                  id={triggerId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-medium text-foreground hover:bg-surface-light/40 transition-colors"
                >
                  <span>{it.q}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-4 h-4 shrink-0 text-accent transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm md:text-[1rem] text-muted leading-relaxed">
                      {it.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </Section>
  )
}
