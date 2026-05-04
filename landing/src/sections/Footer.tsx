// Reformado: filosofía visible en grande, links minimalistas estilo inkdrop.
import { Github, FileText, BookOpen, Sparkles } from 'lucide-react'
import { NoraLogoFull, NoraLogoMark } from '../components/NoraLogo'
import { useLatestRelease } from '../hooks/useLatestRelease'

const REPO = 'https://github.com/na7hk3r/personal-os'

export function Footer() {
  const year = new Date().getFullYear()
  const { release } = useLatestRelease()

  return (
    <footer className="relative border-t border-border bg-surface/30 backdrop-blur mt-20">
      {/* Filosofía como elemento visual central — no en letra chica. */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-16 pb-12 text-center">
        <div className="flex justify-center mb-8">
          <NoraLogoMark size={56} glow />
        </div>
        <p className="font-display text-2xl md:text-3xl font-medium text-foreground leading-snug max-w-2xl mx-auto">
          Hecho con convicción.{' '}
          <span className="text-gradient-accent">Local-first.</span>{' '}
          Sin telemetría. Sin VC money.
        </p>
        <p className="mt-4 text-sm text-muted">
          Una herramienta que vive donde tienen que vivir las cosas tuyas: en tu máquina.
        </p>
      </div>

      <div className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <NoraLogoFull size={28} showTagline />
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Open source, multiplataforma y 100% local. Sin nube, sin cuenta, sin telemetría.
            </p>
            {release && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted">
                <Sparkles className="w-3 h-3 text-accent" aria-hidden="true" />
                Versión actual:{' '}
                <a
                  href={release.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline font-mono"
                >
                  v{release.version}
                </a>
              </p>
            )}
          </div>

          <nav aria-label="Recursos" className="text-sm">
            <h2 className="font-semibold text-foreground mb-3">Producto</h2>
            <ul className="space-y-2 text-muted">
              <li><a href="#features" className="hover:text-accent transition-colors">Para vos</a></li>
              <li><a href="#how-it-works" className="hover:text-accent transition-colors">Cómo funciona</a></li>
              <li><a href="#plugins" className="hover:text-accent transition-colors">Plugins</a></li>
              <li><a href="#download" className="hover:text-accent transition-colors">Descargar</a></li>
              <li><a href="#faq" className="hover:text-accent transition-colors">FAQ</a></li>
            </ul>
          </nav>

          <nav aria-label="Proyecto" className="text-sm">
            <h2 className="font-semibold text-foreground mb-3">Proyecto</h2>
            <ul className="space-y-2 text-muted">
              <li>
                <a
                  href={REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-accent transition-colors"
                >
                  <Github className="w-4 h-4" aria-hidden="true" /> GitHub
                </a>
              </li>
              <li>
                <a
                  href="#devs"
                  className="inline-flex items-center gap-2 hover:text-accent transition-colors"
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" /> Docs
                </a>
              </li>
              <li>
                <a
                  href={`${REPO}/blob/main/CHANGELOG.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-accent transition-colors"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" /> Changelog
                </a>
              </li>
              <li>
                <a
                  href={`${REPO}/releases`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-accent transition-colors"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" /> Releases
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-border/60">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted">
            <p>
              © {year} Nora OS — Licencia ISC · por{' '}
              <a
                href="https://github.com/na7hk3r"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                na7hk3r
              </a>
              . Iconos por{' '}
              <a
                href="https://github.com/xero/svg-icons"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                xero/svg-icons
              </a>
              .
            </p>
            <p>Sin telemetría · sin tracking · 100% local</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
