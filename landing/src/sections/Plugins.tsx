// Reformado: nuevo título, stagger en scroll, hover con glow accent del color del plugin.
import { motion } from 'framer-motion'
import { Section } from '../components/Section'
import { BrandIcon } from '../components/BrandIcon'
import { plugins } from '../data/plugins'

const REPO_URL = 'https://github.com/na7hk3r/personal-os'

export function Plugins() {
  return (
    <Section
      id="plugins"
      eyebrow="Plugins"
      title="Tu sistema, modular."
      description="No es una app. Es una plataforma para organizar tu vida — activás lo que usás, ignorás el resto."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plugins.map(({ id, name, description, domainLabel, icon: Icon, accent, brandArt }, idx) => (
          <motion.article
            key={id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45, delay: (idx % 3) * 0.08 }}
            className="group relative overflow-hidden p-6 rounded-2xl card-gradient border border-border hover-glow min-h-[220px]"
          >
            <div
              aria-hidden="true"
              className={`absolute -top-12 -right-12 w-44 h-44 rounded-full bg-gradient-to-br ${accent} blur-2xl opacity-70 pointer-events-none group-hover:opacity-100 transition-opacity duration-500`}
            />
            <BrandIcon
              name={brandArt}
              size={120}
              tile={false}
              className="pointer-events-none absolute -right-3 -bottom-3 group-hover:rotate-3 group-hover:scale-110 transition-all duration-500 opacity-30 group-hover:opacity-95"
            />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex p-2.5 rounded-lg bg-accent/15 text-accent ring-1 ring-accent/20">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground leading-none">{name}</h3>
                  <p className="text-[10px] uppercase tracking-widest text-muted mt-1.5">
                    {domainLabel}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted leading-relaxed mt-4 max-w-[85%]">{description}</p>
            </div>
          </motion.article>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-10 rounded-2xl border border-dashed border-border bg-surface/30 p-6 text-center"
      >
        <p className="text-sm text-muted">
          Próximamente:{' '}
          <span className="text-foreground font-medium">Goals &amp; OKRs</span>,{' '}
          <span className="text-foreground font-medium">Calendario externo (.ics, Google)</span>
        </p>
        <a
          href={`${REPO_URL}/blob/main/docs/PLUGIN_IDEAS.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          Ver roadmap completo →
        </a>
      </motion.div>
    </Section>
  )
}
