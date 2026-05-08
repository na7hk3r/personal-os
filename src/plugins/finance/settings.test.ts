import { describe, expect, it } from 'vitest'
import { DEFAULT_FINANCE_SETTINGS, normalizeFinanceSettings } from './settings'
import { buildFinanceUi } from './pluginUi'

describe('finance settings', () => {
  it('normalizes feature flags and currency', () => {
    expect(normalizeFinanceSettings({
      budgetsEnabled: false,
      aiContextEnabled: true,
      defaultCurrency: 'usd',
    })).toEqual({
      ...DEFAULT_FINANCE_SETTINGS,
      budgetsEnabled: false,
      aiContextEnabled: true,
      defaultCurrency: 'USD',
    })

    expect(normalizeFinanceSettings({ defaultCurrency: '12' }).defaultCurrency).toBe('UYU')
  })

  it('omits optional finance pages and nav items when disabled', () => {
    const ui = buildFinanceUi(normalizeFinanceSettings({
      budgetsEnabled: false,
      recurringEnabled: false,
      insightsEnabled: false,
    }))

    expect(ui.pages.map((page) => page.path)).toEqual([
      '/finance',
      '/finance/transactions',
      '/finance/categories',
    ])
    expect(ui.navItems.map((item) => item.path)).toEqual([
      '/finance',
      '/finance/transactions',
      '/finance/categories',
    ])
  })
})
