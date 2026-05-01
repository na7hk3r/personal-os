/**
 * Centralized plugin configuration and constants
 * Prevents magic strings scattered across codebase
 */

export const PLUGIN_IDS = {
  FITNESS: 'fitness',
  WORK: 'work',
  FINANCE: 'finance',
  HABITS: 'habits',
  JOURNAL: 'journal',
} as const

export type PluginId = typeof PLUGIN_IDS[keyof typeof PLUGIN_IDS]

export const PLUGIN_NAMES: Record<PluginId, string> = {
  [PLUGIN_IDS.FITNESS]: 'Fitness & Salud',
  [PLUGIN_IDS.WORK]: 'Work & Productividad',
  [PLUGIN_IDS.FINANCE]: 'Finanzas',
  [PLUGIN_IDS.HABITS]: 'Hábitos',
  [PLUGIN_IDS.JOURNAL]: 'Journal',
}

export const PLUGIN_DESCRIPTIONS: Record<PluginId, string> = {
  [PLUGIN_IDS.FITNESS]: 'Registrá tu peso, comidas, entrenamientos y medidas corporales. Seguí tus hábitos día a día.',
  [PLUGIN_IDS.WORK]: 'Tablero Kanban, notas y gestión de enlaces. Todo lo que necesitás para organizar tu trabajo.',
  [PLUGIN_IDS.FINANCE]: 'Movimientos, cuentas, presupuestos y gastos recurrentes. Awareness sin contabilidad.',
  [PLUGIN_IDS.HABITS]: 'Hábitos diarios y semanales con racha, heatmap y toggle rápido del día.',
  [PLUGIN_IDS.JOURNAL]: 'Diario personal con mood tracking, prompts y búsqueda rápida.',
}

/**
 * Check if a plugin ID is valid
 */
export function isValidPluginId(id: string): id is PluginId {
  return Object.values(PLUGIN_IDS).includes(id as PluginId)
}

/**
 * Get plugin name by ID
 */
export function getPluginName(pluginId: PluginId): string {
  return PLUGIN_NAMES[pluginId] ?? pluginId
}

/**
 * Get plugin description by ID
 */
export function getPluginDescription(pluginId: PluginId): string {
  return PLUGIN_DESCRIPTIONS[pluginId] ?? ''
}
