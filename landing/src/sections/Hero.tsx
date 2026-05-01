import { Github, ExternalLink } from 'lucide-react'
import { Button } from '../components/Button'
import { DownloadButton } from '../components/DownloadButton'

const REPO_URL = 'https://github.com/na7hk3r/personal-os'

export function Hero() {
  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 px-4 md:px-8 max-w-6xl mx-auto text-center overflow-hidden">
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/20 blur-3xl" />
      </div>

      <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-light border border-border text-sm text-muted mb-6 animate-fade-in">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" aria-hidden="true" />
        100 % local · open source · multiplataforma
      </p>

      <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground animate-slide-up">
        Personal OS
        <span className="block mt-3 text-2xl md:text-3xl lg:text-4xl font-medium text-muted">
          Tu sistema operativo personal modular
        </span>
      </h1>

      <p className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-muted leading-relaxed animate-slide-up">
        Productividad, hábitos, finanzas y salud en una sola app de escritorio.
        Plugins, gamificación, IA local opcional y cero telemetría.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
        <DownloadButton size="lg" />
        <Button
          as="a"
          href={REPO_URL}
          variant="secondary"
          size="lg"
          target="_blank"
          rel="noopener noreferrer"
          leftIcon={<Github className="w-5 h-5" aria-hidden="true" />}
          rightIcon={<ExternalLink className="w-4 h-4" aria-hidden="true" />}
        >
          Ver en GitHub
        </Button>
      </div>

      <p className="mt-6 text-sm text-muted">
        Disponible para Windows, Linux y macOS · Licencia ISC
      </p>
    </section>
  )
}
