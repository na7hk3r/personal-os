import { Github, ExternalLink } from 'lucide-react'
import { Button } from '../components/Button'
import { DownloadButton } from '../components/DownloadButton'
import { BrandIcon } from '../components/BrandIcon'
import { useTypewriter } from '../hooks/useTypewriter'

const REPO_URL = 'https://github.com/na7hk3r/personal-os'

const COPILOT_LINE =
  'Hoy estás 18% por debajo de tu foco semanal. Tenés 2 tareas que vencen hoy.'

export function Hero() {
  const { text, done, ref } = useTypewriter<HTMLDivElement>(COPILOT_LINE, {
    speed: 28,
    startDelay: 600,
    whenVisible: true,
  })

  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 px-4 md:px-8 max-w-6xl mx-auto text-center overflow-hidden">
      {/* Grid de puntos sutil — sensación "datos / sistema" */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(rgb(var(--color-muted) / 0.35) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage:
            'radial-gradient(ellipse at 50% 30%, #000 35%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at 50% 30%, #000 35%, transparent 75%)',
        }}
      />

      {/* Glow de acento detrás del título */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 -z-10 w-[520px] h-[520px] rounded-full bg-accent/15 blur-3xl"
      />

      <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-light border border-border text-sm text-muted mb-6 animate-fade-in">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" aria-hidden="true" />
        Copiloto local · Sin nube · Open source
      </p>

      <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground animate-slide-up leading-[1.05]">
        El copiloto que conoce
        <span className="block mt-2 text-accent">toda tu vida.</span>
      </h1>

      <p className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-muted leading-relaxed animate-slide-up">
        Nora OS conecta tu trabajo, salud, hábitos y finanzas para decirte
        qué hacer hoy — sin enviar tus datos a ningún servidor.
      </p>

      {/* Línea typewriter simulando al copiloto */}
      <div
        ref={ref}
        className="mt-10 mx-auto max-w-2xl rounded-2xl border border-border bg-surface/60 backdrop-blur-sm px-5 py-4 text-left shadow-sm animate-slide-up"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted mb-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse"
            aria-hidden="true"
          />
          Copiloto · ahora
        </div>
        <p className="font-mono text-sm md:text-base text-foreground min-h-[1.5em]">
          {text}
          <span
            aria-hidden="true"
            className={`inline-block w-[0.55ch] -mb-[2px] ml-[1px] bg-accent ${
              done ? 'animate-pulse' : ''
            }`}
            style={{ height: '1em', verticalAlign: 'middle' }}
          />
        </p>
      </div>

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
        Windows · Linux · macOS · Licencia ISC · Sin cuenta requerida
      </p>

      {/* Brand strip — identidad gráfica de Nora OS */}
      <div className="mt-12 md:mt-16 relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        />
        <div className="relative flex items-center justify-center gap-4 md:gap-7 flex-wrap">
          {(
            [
              { name: 'LaptopShell', label: 'Productividad' },
              { name: 'Magic', label: 'Hábitos & salud' },
              { name: 'TreasureChest', label: 'Finanzas' },
              { name: 'HourGlass', label: 'Tiempo' },
              { name: 'TomeIdea', label: 'Conocimiento' },
              { name: 'CrystalBallEye', label: 'Copiloto IA' },
            ] as const
          ).map(({ name, label }) => (
            <div
              key={name}
              className="group flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl bg-[#fbf7ee] border border-border/60 shadow-sm backdrop-blur transition-all hover:border-accent/50 hover:-translate-y-0.5"
              title={label}
            >
              <BrandIcon
                name={name}
                size={40}
                tile={false}
                className="transition-transform group-hover:scale-110"
              />
              <span className="text-[10px] uppercase tracking-widest text-[#604c3c] group-hover:text-[#2e2014] transition-colors">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
