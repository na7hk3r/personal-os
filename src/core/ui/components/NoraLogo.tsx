// Logo "N" de Nora OS — versión vectorial reutilizable en la app de escritorio.
// Idéntico al de la landing pero sin dependencias externas; hereda color por currentColor.
import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & {
  size?: number
  glow?: boolean
}

export function NoraLogoMark({ size = 28, glow = false, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Nora OS"
      style={glow ? { filter: 'drop-shadow(0 0 10px rgb(var(--color-accent) / 0.55))' } : undefined}
      {...rest}
    >
      <defs>
        <linearGradient id="nora-mark-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--color-accent-light))" />
          <stop offset="100%" stopColor="rgb(var(--color-accent))" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
      <circle cx="32" cy="4" r="2" fill="rgb(var(--color-accent-light))" />
      <circle cx="60" cy="32" r="1.6" fill="rgb(var(--color-accent-light))" opacity="0.7" />
      <circle cx="32" cy="60" r="1.6" fill="rgb(var(--color-accent-light))" opacity="0.7" />
      <circle cx="4" cy="32" r="2" fill="rgb(var(--color-accent-light))" />
      <g stroke="url(#nora-mark-grad)" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <line x1="20" y1="18" x2="20" y2="46" />
        <line x1="44" y1="18" x2="44" y2="46" />
        <line x1="20" y1="18" x2="44" y2="46" />
      </g>
    </svg>
  )
}
