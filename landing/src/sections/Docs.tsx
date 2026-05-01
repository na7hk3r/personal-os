import { useEffect, useMemo, useState } from 'react'
import { marked } from 'marked'
import { FileText, ExternalLink, Search } from 'lucide-react'
import { Section } from '../components/Section'

// Importa todos los .md de /docs como strings en build time.
// Vite resuelve la ruta relativa desde este archivo.
const docModules = import.meta.glob<string>('../../../docs/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

interface DocEntry {
  /** Slug usado en el hash, ej: "AUTH" */
  slug: string
  /** Nombre amigable mostrado en el sidebar */
  label: string
  /** Contenido markdown crudo */
  source: string
  /** Path original (para enlace a GitHub) */
  filename: string
}

const REPO_DOCS_URL = 'https://github.com/na7hk3r/personal-os/blob/main/docs'

/**
 * Convierte "ARCHITECTURE.md" → "Architecture",
 * "PLUGIN_API.md" → "Plugin API", etc.
 */
function prettifySlug(slug: string): string {
  return slug
    .split('_')
    .map((part) => {
      if (part.length <= 3 && part === part.toUpperCase()) return part
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join(' ')
}

const docs: DocEntry[] = Object.entries(docModules)
  .map(([path, source]) => {
    const filename = path.split('/').pop() ?? path
    const slug = filename.replace(/\.md$/i, '')
    return {
      slug,
      label: prettifySlug(slug),
      source,
      filename,
    }
  })
  .sort((a, b) => a.label.localeCompare(b.label, 'es'))

// Configuración de marked
marked.setOptions({
  gfm: true,
  breaks: false,
})

function getInitialSlug(): string {
  if (typeof window === 'undefined') return docs[0]?.slug ?? ''
  const hash = window.location.hash
  const match = hash.match(/#docs\/([\w.-]+)/i)
  if (match) {
    const wanted = match[1].replace(/\.md$/i, '')
    const found = docs.find((d) => d.slug.toLowerCase() === wanted.toLowerCase())
    if (found) return found.slug
  }
  return docs[0]?.slug ?? ''
}

export function Docs() {
  const [activeSlug, setActiveSlug] = useState<string>(getInitialSlug)
  const [query, setQuery] = useState('')

  useEffect(() => {
    function onHashChange() {
      const next = getInitialSlug()
      if (next) setActiveSlug(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const active = useMemo(
    () => docs.find((d) => d.slug === activeSlug) ?? docs[0],
    [activeSlug],
  )

  const html = useMemo(() => {
    if (!active) return ''
    try {
      return marked.parse(active.source) as string
    } catch (err) {
      console.error('Error rendering markdown', err)
      return `<pre>${active.source}</pre>`
    }
  }, [active])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return docs
    return docs.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        d.source.toLowerCase().includes(q),
    )
  }, [query])

  if (docs.length === 0) {
    return (
      <Section id="docs" eyebrow="Documentación" title="Sin documentos disponibles">
        <p className="text-center text-muted">
          No se encontraron archivos en /docs.
        </p>
      </Section>
    )
  }

  return (
    <Section
      id="docs"
      eyebrow="Documentación"
      title="Explora la documentación técnica"
      description="Arquitectura, plugins, autenticación y más — directo desde el repositorio."
    >
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
        {/* Sidebar */}
        <aside className="rounded-2xl border border-border bg-surface/60 p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <label className="relative block mb-4">
            <span className="sr-only">Buscar en la documentación</span>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Buscar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-base/60 border border-border focus:border-accent focus:outline-none text-foreground placeholder:text-muted"
            />
          </label>
          <nav aria-label="Documentos">
            <ul className="space-y-1">
              {filtered.map((d) => {
                const isActive = d.slug === active?.slug
                return (
                  <li key={d.slug}>
                    <a
                      href={`#docs/${d.slug}`}
                      onClick={() => setActiveSlug(d.slug)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-accent/15 text-foreground border border-accent/40'
                          : 'text-muted hover:bg-surface-light hover:text-foreground border border-transparent'
                      }`}
                    >
                      <FileText
                        className="w-3.5 h-3.5 shrink-0 opacity-70"
                        aria-hidden="true"
                      />
                      <span className="truncate">{d.label}</span>
                    </a>
                  </li>
                )
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted">Sin resultados.</li>
              )}
            </ul>
          </nav>
        </aside>

        {/* Viewer */}
        <article className="rounded-2xl border border-border bg-surface/60 p-6 md:p-10 min-w-0">
          {active && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
                <h3 className="text-2xl font-bold text-foreground">{active.label}</h3>
                <a
                  href={`${REPO_DOCS_URL}/${active.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
                >
                  Ver en GitHub
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
              <div
                className="markdown-body"
                // El contenido proviene de archivos .md propios del repositorio,
                // no de input externo, por lo que no se sanitiza.
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </>
          )}
        </article>
      </div>
    </Section>
  )
}
