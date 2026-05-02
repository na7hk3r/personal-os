import type { CSSProperties, HTMLAttributes } from 'react'

/**
 * Conjunto de iconos disponibles en `public/icons/` provenientes de
 * https://github.com/xero/svg-icons (CC0 / dominio público).
 * Mantener sincronizado con los SVG que copiemos al bundle del renderer.
 */
export type BrandIconName =
  | 'BookCode'
  | 'BookJournal'
  | 'BrainSlug'
  | 'Cards'
  | 'Chip'
  | 'CrystalBallEye'
  | 'Floppy'
  | 'HourGlass'
  | 'LaptopShell'
  | 'Magic'
  | 'Terminal'
  | 'TomeAtlas'
  | 'TomeIdea'
  | 'Tools'
  | 'TreasureChest'
  | 'Zettelkasten'

interface BrandIconProps extends HTMLAttributes<HTMLSpanElement> {
  name: BrandIconName
  /** Tamaño en px (alto = ancho). Default 20. */
  size?: number
  className?: string
}

/**
 * Renderiza un SVG ilustrativo (xero/svg-icons) como CSS mask-image,
 * heredando el color de `currentColor` para que respete tema y contraste.
 *
 * Uso: <BrandIcon name="Magic" size={32} className="text-accent" />
 */
export function BrandIcon({ name, size = 20, className = '', style, ...rest }: BrandIconProps) {
  const url = `${import.meta.env.BASE_URL}icons/${name}.svg`
  const masked: CSSProperties = {
    width: size,
    height: size,
    display: 'inline-block',
    backgroundColor: 'currentColor',
    WebkitMaskImage: `url(${url})`,
    maskImage: `url(${url})`,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    flexShrink: 0,
    ...style,
  }
  return <span aria-hidden role="img" className={className} style={masked} {...rest} />
}
