import { Github, FileText, Heart, Sparkles } from 'lucide-react'
import { useLatestRelease } from '../hooks/useLatestRelease'

const REPO = 'https://github.com/na7hk3r/personal-os'

export function Footer() {
  const year = new Date().getFullYear()
  const { release } = useLatestRelease()

  return (
    <footer className="border-t border-border bg-surface/40 backdrop-blur mt-10">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <p className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
            Personal OS
          </p>
          <p className="mt-3 text-base font-medium text-foreground/90">
            Tu copiloto. Tu máquina. Tus datos.
          </p>
          <p className="mt-2 text-sm text-muted leading-relaxed">
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
          <h2 className="font-semibold text-foreground mb-3">Recursos</h2>
          <ul className="space-y-2 text-muted">
            <li>
              <a href="#how-it-works" className="hover:text-accent transition-colors">
                Cómo funciona
              </a>
            </li>
            <li>
              <a href="#features" className="hover:text-accent transition-colors">
                Para vos
              </a>
            </li>
            <li>
              <a href="#plugins" className="hover:text-accent transition-colors">
                Plugins
              </a>
            </li>
            <li>
              <a href="#download" className="hover:text-accent transition-colors">
                Descargar
              </a>
            </li>
            <li>
              <a href="#faq" className="hover:text-accent transition-colors">
                FAQ
              </a>
            </li>
          </ul>
        </nav>

        <nav aria-label="Enlaces" className="text-sm">
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
                href={`${REPO}/releases`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-accent transition-colors"
              >
                <FileText className="w-4 h-4" aria-hidden="true" /> Releases
              </a>
            </li>
            <li>
              <a
                href={`${REPO}/blob/main/CHANGELOG.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-accent transition-colors"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" /> Novedades
              </a>
            </li>
            <li>
              <a
                href="#devs"
                className="inline-flex items-center gap-2 hover:text-accent transition-colors"
              >
                <FileText className="w-4 h-4" aria-hidden="true" /> Para devs
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted">
          <p>
            © {year} Personal OS — Licencia ISC. Hecho con{' '}
            <Heart className="inline w-3 h-3 text-accent" aria-label="amor" /> por{' '}
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
    </footer>
  )
}
