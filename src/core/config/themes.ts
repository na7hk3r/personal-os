/**
 * Centralized theme configuration
 * Used in ControlCenter and Shell
 */

export interface ThemeOption {
  value: string
  label: string
  description: string
}

export const THEMES: ThemeOption[] = [
  {
    value: 'default',
    label: 'Default',
    description: 'Dark clásico — purples y slate',
  },
  {
    value: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'Negros profundos, cian y magenta neon',
  },
  {
    value: 'calma',
    label: 'Calma',
    description: 'Azules profundos, relajado',
  },
  {
    value: 'bosque',
    label: 'Bosque',
    description: 'Verdes oscuros, natural',
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Tonos claros, alto contraste',
  },
] as const

export function getThemeLabel(themeValue: string): string {
  return THEMES.find((t) => t.value === themeValue)?.label ?? themeValue
}

export function getThemeDescription(themeValue: string): string {
  return THEMES.find((t) => t.value === themeValue)?.description ?? ''
}
