import { useState } from 'react'
import { ImageOff } from 'lucide-react'

export interface ScreenshotTab {
  id: string
  label: string
  src: string
  alt: string
  caption?: string
}

interface Props {
  tabs: ScreenshotTab[]
  /** id por defecto. Default: primer tab. */
  defaultTabId?: string
}

export function ScreenshotTabs({ tabs, defaultTabId }: Props) {
  const [activeId, setActiveId] = useState<string>(defaultTabId ?? tabs[0]?.id ?? '')
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]

  if (!active) return null

  return (
    <div>
      {/* Tablist */}
      <div
        role="tablist"
        aria-label="Capturas de Nora OS"
        className="flex flex-wrap gap-2 justify-center mb-6"
      >
        {tabs.map((t) => {
          const isActive = t.id === active.id
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              id={`shot-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`shot-panel-${t.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-surface/60 text-muted border-border hover:text-foreground hover:border-accent/40'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div
        role="tabpanel"
        id={`shot-panel-${active.id}`}
        aria-labelledby={`shot-tab-${active.id}`}
        className="rounded-2xl overflow-hidden border border-border bg-surface/60 group animate-fade-in"
      >
        <div className="aspect-[16/10] bg-surface-light flex items-center justify-center overflow-hidden relative">
          <img
            key={active.src}
            src={`${import.meta.env.BASE_URL}${active.src}`}
            alt={active.alt}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              const sibling = (e.currentTarget as HTMLImageElement)
                .nextElementSibling as HTMLElement | null
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
        {active.caption && (
          <p className="px-5 py-4 text-sm text-muted border-t border-border">
            {active.caption}
          </p>
        )}
      </div>
    </div>
  )
}
