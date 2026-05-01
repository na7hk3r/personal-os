import { Section } from '../components/Section'
import { ImageOff } from 'lucide-react'

interface Shot {
  src: string
  alt: string
  caption: string
}

const shots: Shot[] = [
  {
    src: 'screenshots/dashboard.png',
    alt: 'Dashboard de Personal OS con misiones y stats',
    caption: 'Dashboard',
  },
  {
    src: 'screenshots/plugins.png',
    alt: 'Listado de plugins en el Control Center',
    caption: 'Plugins',
  },
  {
    src: 'screenshots/auditor.png',
    alt: 'Panel de auditoría de consistencia',
    caption: 'Consistency Auditor',
  },
]

export function Screenshots() {
  return (
    <Section
      id="screenshots"
      eyebrow="Capturas"
      title="Una interfaz pensada para que la uses todos los días"
      description="Atajos globales, palette de comandos y temas dark/light cuidados al detalle."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {shots.map((s) => (
          <figure
            key={s.src}
            className="rounded-2xl overflow-hidden border border-border bg-surface/60 hover:border-accent/50 transition-colors group"
          >
            <div className="aspect-[16/10] bg-surface-light flex items-center justify-center overflow-hidden relative">
              <img
                src={`${import.meta.env.BASE_URL}${s.src}`}
                alt={s.alt}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  // Si la imagen no existe aún, mostrar placeholder
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                  const sibling = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null
                  if (sibling) sibling.style.display = 'flex'
                }}
              />
              <div
                className="absolute inset-0 hidden flex-col items-center justify-center text-muted gap-2"
                aria-hidden="true"
              >
                <ImageOff className="w-8 h-8" />
                <span className="text-sm">Captura próximamente</span>
              </div>
            </div>
            <figcaption className="p-4 text-sm font-medium text-foreground">
              {s.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  )
}
