// Logo "N" de Nora OS reproducido en SVG vectorial con orbitales (variante mark-only).
// Permite control de color por currentColor — clave para uso en Navbar/Footer/light/dark.
import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & {
  /** Tamaño en px del cuadrado contenedor. */
  size?: number
  /** Si true, aplica un sutil glow alrededor del símbolo. */
  glow?: boolean
}

export function NoraLogoMark({ size = 32, glow = false, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Nora OS"
      style={glow ? { filter: 'drop-shadow(0 0 10px rgb(var(--color-glow) / 0.55))' } : undefined}
      {...rest}
    >
      <defs>
        <linearGradient id="nora-n-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--color-accent-light))" />
          <stop offset="100%" stopColor="rgb(var(--color-accent))" />
        </linearGradient>
      </defs>

      {/* Anillo exterior */}
      <circle
        cx="32"
        cy="32"
        r="28"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />
      {/* Anillo interior */}
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1"
      />

      {/* Nodos orbitales — referencia "data cluster" del manual */}
      <circle cx="32" cy="4" r="2" fill="rgb(var(--color-accent-light))" />
      <circle cx="60" cy="32" r="1.6" fill="rgb(var(--color-accent-light))" opacity="0.7" />
      <circle cx="32" cy="60" r="1.6" fill="rgb(var(--color-accent-light))" opacity="0.7" />
      <circle cx="4" cy="32" r="2" fill="rgb(var(--color-accent-light))" />

      {/* Letra N estilizada — dos verticales + diagonal */}
      <g stroke="url(#nora-n-grad)" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <line x1="20" y1="18" x2="20" y2="46" />
        <line x1="44" y1="18" x2="44" y2="46" />
        <line x1="20" y1="18" x2="44" y2="46" />
      </g>
    </svg>
  )
}

/**
 * Versión completa con wordmark al lado.
 * Útil para Footer y para el "splash" del Hero.
 */
export function NoraLogoFull({
  size = 32,
  showTagline = false,
  className,
}: {
  size?: number
  showTagline?: boolean
  className?: string
}) {
  return (
    <div className={`inline-flex items-center gap-3 ${className ?? ''}`}>
      <NoraLogoMark size={size} />
      <div className="flex flex-col leading-none">
        <span
          className="font-display font-bold tracking-[0.18em] text-foreground"
          style={{ fontSize: size * 0.55 }}
        >
          NORA<span className="text-accent-light ml-1">OS</span>
        </span>
        {showTagline && (
          <span
            className="mt-1 font-mono uppercase tracking-[0.25em] text-muted"
            style={{ fontSize: size * 0.22 }}
          >
            Tu sistema · Tu vida · Una sola IA
          </span>
        )}
      </div>
    </div>
  )
}
