import { Section } from '../components/Section'
import { plugins } from '../data/plugins'

const REPO_URL = 'https://github.com/na7hk3r/personal-os'

export function Plugins() {
  return (
    <Section
      id="plugins"
      eyebrow="Plugins"
      title="Construido alrededor de tus hábitos"
      description="Cada plugin es independiente y se puede activar o desactivar en caliente desde el Control Center."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plugins.map(({ id, name, description, domainLabel, icon: Icon, accent }) => (
          <article
            key={id}
            className="relative overflow-hidden p-6 rounded-2xl bg-surface/70 border border-border hover:border-accent/50 transition-all duration-300"
          >
            <div
              aria-hidden="true"
              className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${accent} blur-2xl opacity-70 pointer-events-none`}
            />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex p-2.5 rounded-lg bg-accent/15 text-accent">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground leading-none">
                    {name}
                  </h3>
                  <p className="text-xs uppercase tracking-wider text-muted mt-1">
                    {domainLabel}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted leading-relaxed mt-4">{description}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface/30 p-6 text-center">
        <p className="text-sm text-muted">
          En desarrollo:{' '}
          <span className="text-foreground font-medium">Knowledge</span>,{' '}
          <span className="text-foreground font-medium">Time Tracking</span>,{' '}
          <span className="text-foreground font-medium">Goals &amp; OKRs</span>
        </p>
        <a
          href={`${REPO_URL}/blob/main/docs/PLUGIN_IDEAS.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          Ver roadmap completo →
        </a>
      </div>
    </Section>
  )
}
