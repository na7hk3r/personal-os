import { Puzzle, Code2, GitBranch, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Section } from '../components/Section'
import { Docs } from './Docs'

const REPO_URL = 'https://github.com/na7hk3r/personal-os'

interface DevCard {
  title: string
  description: string
  href: string
  linkText: string
  icon: typeof Puzzle
}

const cards: DevCard[] = [
  {
    title: 'Plugin system',
    description:
      'Creá un plugin nuevo en 2 minutos con el scaffolding. npm run create-plugin -- mi-plugin y listo.',
    href: `${REPO_URL}/blob/main/docs/PLUGIN_BASE_STRUCTURE.md`,
    linkText: 'docs/PLUGIN_BASE_STRUCTURE',
    icon: Puzzle,
  },
  {
    title: 'CoreAPI',
    description:
      'Acceso completo a storage, EventBus, gamificación, IA context y settings. Una API estable, tipada, testeada.',
    href: `${REPO_URL}/blob/main/docs/PLUGIN_API.md`,
    linkText: 'docs/PLUGIN_API',
    icon: Code2,
  },
  {
    title: 'Open source',
    description:
      'MIT/ISC. Forkeable. Auditeable. Contribuible. Sin vendor lock-in, sin dependencias propietarias.',
    href: REPO_URL,
    linkText: 'github.com/na7hk3r/personal-os',
    icon: GitBranch,
  },
]

export function ForDevs() {
  const [docsOpen, setDocsOpen] = useState(false)

  return (
    <Section
      id="devs"
      eyebrow="Para desarrolladores"
      title="Una plataforma, no una app cerrada."
      description="Nora OS está diseñado para extenderse. Si sabés TypeScript, podés agregar un módulo nuevo en una tarde."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map(({ title, description, href, linkText, icon: Icon }) => (
          <article
            key={title}
            className="p-6 rounded-2xl bg-surface/60 backdrop-blur border border-border hover:border-accent/50 transition-all duration-300 flex flex-col"
          >
            <div className="inline-flex p-3 rounded-xl bg-accent/10 text-accent mb-4 w-fit">
              <Icon className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted leading-relaxed flex-1">{description}</p>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-sm text-accent hover:underline inline-flex items-center gap-1 font-mono"
            >
              → {linkText}
            </a>
          </article>
        ))}
      </div>

      <div className="mt-12 text-center">
        <button
          type="button"
          onClick={() => setDocsOpen((v) => !v)}
          aria-expanded={docsOpen}
          aria-controls="devs-docs-viewer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-light hover:bg-surface-lighter border border-border text-foreground transition-colors font-medium"
        >
          {docsOpen ? 'Ocultar' : 'Explorar documentación técnica completa'}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${docsOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {docsOpen && (
        <div id="devs-docs-viewer" className="mt-8 animate-fade-in">
          <Docs />
        </div>
      )}
    </Section>
  )
}
