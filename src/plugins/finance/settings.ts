export interface FinancePluginSettings {
  budgetsEnabled: boolean
  recurringEnabled: boolean
  insightsEnabled: boolean
  transfersEnabled: boolean
  anomalyAlertsEnabled: boolean
  aiContextEnabled: boolean
  defaultCurrency: string
}

export const FINANCE_SETTINGS_KEY = 'pluginSettings:finance'

export const DEFAULT_FINANCE_SETTINGS: FinancePluginSettings = {
  budgetsEnabled: true,
  recurringEnabled: true,
  insightsEnabled: true,
  transfersEnabled: true,
  anomalyAlertsEnabled: true,
  aiContextEnabled: false,
  defaultCurrency: 'UYU',
}

export function normalizeFinanceSettings(
  input: Partial<FinancePluginSettings> | null | undefined,
): FinancePluginSettings {
  return {
    budgetsEnabled: input?.budgetsEnabled ?? DEFAULT_FINANCE_SETTINGS.budgetsEnabled,
    recurringEnabled: input?.recurringEnabled ?? DEFAULT_FINANCE_SETTINGS.recurringEnabled,
    insightsEnabled: input?.insightsEnabled ?? DEFAULT_FINANCE_SETTINGS.insightsEnabled,
    transfersEnabled: input?.transfersEnabled ?? DEFAULT_FINANCE_SETTINGS.transfersEnabled,
    anomalyAlertsEnabled: input?.anomalyAlertsEnabled ?? DEFAULT_FINANCE_SETTINGS.anomalyAlertsEnabled,
    aiContextEnabled: input?.aiContextEnabled ?? DEFAULT_FINANCE_SETTINGS.aiContextEnabled,
    defaultCurrency: normalizeCurrency(input?.defaultCurrency),
  }
}

export async function loadFinanceSettings(): Promise<FinancePluginSettings> {
  if (!window.storage) return DEFAULT_FINANCE_SETTINGS

  const rows = await window.storage.query(
    `SELECT value FROM settings WHERE key = ? LIMIT 1`,
    [FINANCE_SETTINGS_KEY],
  ) as { value: string }[]

  const raw = rows[0]?.value
  if (!raw) return DEFAULT_FINANCE_SETTINGS

  try {
    return normalizeFinanceSettings(JSON.parse(raw) as Partial<FinancePluginSettings>)
  } catch {
    return DEFAULT_FINANCE_SETTINGS
  }
}

export async function saveFinanceSettings(settings: FinancePluginSettings): Promise<FinancePluginSettings> {
  const normalized = normalizeFinanceSettings(settings)
  if (!window.storage) return normalized

  await window.storage.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [FINANCE_SETTINGS_KEY, JSON.stringify(normalized)],
  )
  return normalized
}

function normalizeCurrency(value: unknown): string {
  const currency = typeof value === 'string'
    ? value.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
    : ''
  return currency.length === 3 ? currency : DEFAULT_FINANCE_SETTINGS.defaultCurrency
}
