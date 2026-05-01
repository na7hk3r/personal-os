import { Section } from '../components/Section'
import { features } from '../data/features'

export function Features() {
  return (
    <Section
      id="features"
      eyebrow="Para vos"
      title="Lo que vas a notar desde el primer día"
      description="Sin features de checklist técnica. Beneficios reales, en tu rutina, hoy."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map(({ title, description, icon: Icon }) => (
          <article
            key={title}
            className="group p-7 rounded-2xl bg-surface/60 backdrop-blur border border-border hover:border-accent/50 hover:bg-surface transition-all duration-300"
          >
            <div className="inline-flex p-3 rounded-xl bg-accent/10 text-accent mb-5 group-hover:bg-accent group-hover:text-white transition-colors">
              <Icon className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-foreground mb-3">
              {title}
            </h3>
            <p className="text-sm md:text-base text-muted leading-relaxed">
              {description}
            </p>
          </article>
        ))}
      </div>
    </Section>
  )
}
