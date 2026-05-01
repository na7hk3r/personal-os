import { Github } from 'lucide-react'
import { ThemeToggle } from './components/ThemeToggle'
import { Hero } from './sections/Hero'
import { Features } from './sections/Features'
import { Plugins } from './sections/Plugins'
import { Screenshots } from './sections/Screenshots'
import { Download_ } from './sections/Download'
import { Docs } from './sections/Docs'
import { FAQ } from './sections/FAQ'
import { Footer } from './sections/Footer'

const REPO_URL = 'https://github.com/na7hk3r/personal-os'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg"
      >
        Saltar al contenido
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-base/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <a href="#" className="font-bold text-foreground text-lg flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
            Personal OS
          </a>
          <nav aria-label="Principal" className="hidden md:flex items-center gap-6 text-sm text-muted">
            <a href="#features" className="hover:text-foreground transition-colors">
              Características
            </a>
            <a href="#plugins" className="hover:text-foreground transition-colors">
              Plugins
            </a>
            <a href="#download" className="hover:text-foreground transition-colors">
              Descargar
            </a>
            <a href="#docs" className="hover:text-foreground transition-colors">
              Docs
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Repositorio en GitHub"
              className="p-2 rounded-lg bg-surface-light hover:bg-surface-lighter border border-border transition-colors text-foreground"
            >
              <Github className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Hero />
        <Features />
        <Plugins />
        <Screenshots />
        <Download_ />
        <Docs />
        <FAQ />
      </main>

      <Footer />
    </div>
  )
}
