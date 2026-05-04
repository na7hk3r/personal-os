// Reformado: cards con gradiente sutil, hover-glow y stagger en scroll.
import { motion } from 'framer-motion'
import { Section } from '../components/Section'
import { features } from '../data/features'

export function Features() {
  return (
    <Section
      id="features"
      eyebrow="Para vos"
      title="Lo que vas a notar desde el primer día"
      description="Sin checklist técnica. Beneficios reales en tu rutina, sin sacrificar tu privacidad."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map(({ title, description, tag, icon: Icon }, idx) => (
          <motion.article
            key={title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45, delay: (idx % 3) * 0.08 }}
            className="group relative overflow-hidden p-7 rounded-2xl card-gradient border border-border hover-glow"
          >
            {/* halo accent que aparece en hover */}
            <div
              aria-hidden="true"
              className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-accent/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />

            <div className="relative">
              <div className="inline-flex p-3 rounded-xl bg-accent/15 text-accent mb-5 ring-1 ring-accent/20 group-hover:bg-accent group-hover:text-white transition-colors">
                <Icon className="w-6 h-6" aria-hidden="true" />
              </div>
              {tag && (
                <p className="text-[10px] uppercase tracking-widest text-accent mb-2 font-semibold">
                  {tag}
                </p>
              )}
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-3 leading-snug">
                {title}
              </h3>
              <p className="text-sm md:text-[1rem] text-muted leading-relaxed">{description}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </Section>
  )
}
