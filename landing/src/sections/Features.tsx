import { Section } from '../components/Section'
import { features } from '../data/features'

export function Features() {
  return (
    <Section
      id="features"
      eyebrow="Capacidades"
      title="Todo lo que necesitás, en tu propia máquina"
      description="Una base sólida con plugins de primera clase. Activá lo que usás, ignorá el resto."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map(({ title, description, icon: Icon }) => (
          <article
            key={title}
            className="group p-6 rounded-2xl bg-surface/60 backdrop-blur border border-border hover:border-accent/50 hover:bg-surface transition-all duration-300"
          >
            <div className="inline-flex p-3 rounded-xl bg-accent/10 text-accent mb-4 group-hover:bg-accent group-hover:text-white transition-colors">
              <Icon className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted leading-relaxed">{description}</p>
          </article>
        ))}
      </div>
    </Section>
  )
}
