import type { CSSProperties, HTMLAttributes } from 'react'

/**
 * Iconos disponibles en `landing/public/icons/` (subset curado de
 * https://github.com/xero/svg-icons, CC0 / dominio público).
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
 * Renderiza el SVG como mask-image con currentColor para respetar tema/contraste.
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
