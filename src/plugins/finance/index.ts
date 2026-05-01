/**
 * Plugin Finance — manifest principal.
 *
 * Provee captura rápida de movimientos, presupuestos, recurrentes y un
 * proveedor de contexto IA. La filosofía es "awareness sin contabilidad":
 * cero números de débito/crédito, una sola unidad por moneda en centavos.
 */

import type { PluginManifest, CoreAPI } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { useFinanceStore } from './store'
import { FINANCE_EVENTS } from './events'
import { runRecurringEngine } from './operations'
import { detectAnomaly } from './insights'
import { registerAIContextProvider } from '@core/services/aiContextRegistry'
import { financeAIProvider } from './aiProvider'
import { eventBus } from '@core/events/EventBus'
import { FinanceSummaryWidget } from './components/FinanceSummaryWidget'
import { FinanceDashboard } from './pages/FinanceDashboard'
import { TransactionsPage } from './pages/TransactionsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { BudgetsPage } from './pages/BudgetsPage'
import { RecurringPage } from './pages/RecurringPage'
import { InsightsPage } from './pages/InsightsPage'
import type { Account, Category, Transaction, Recurring, Budget, RecurringTemplate } from './types'

const financePlugin: PluginManifest = {
  id: 'finance',
  name: 'Finanzas',
  version: '1.0.0',
  description: 'Movimientos, cuentas, presupuestos y gastos recurrentes.',
  icon: 'Wallet',
  domain: 'finance',
  domainKeywords: ['money', 'budget', 'transactions', 'recurring'],
  iconography: {
    primary: 'Wallet',
    gallery: ['Wallet', 'Receipt', 'Tag', 'Repeat', 'PiggyBank', 'Coins', 'TrendingUp', 'TrendingDown', 'BarChart3', 'LineChart'],
  },

  migrations: [
    {
      version: 1,
      up: `
        CREATE TABLE IF NOT EXISTS finance_accounts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          currency TEXT NOT NULL DEFAULT 'UYU',
          initial_balance INTEGER NOT NULL DEFAULT 0,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS finance_categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          parent_id TEXT,
          kind TEXT NOT NULL DEFAULT 'expense',
          color TEXT,
          archived INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (parent_id) REFERENCES finance_categories(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS finance_transactions (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          category_id TEXT,
          kind TEXT NOT NULL,
          amount INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'UYU',
          occurred_at TEXT NOT NULL,
          note TEXT,
          recurring_id TEXT,
          transfer_pair_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES finance_accounts(id) ON DELETE RESTRICT,
          FOREIGN KEY (category_id) REFERENCES finance_categories(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_finance_tx_account_date ON finance_transactions(account_id, occurred_at);
        CREATE INDEX IF NOT EXISTS idx_finance_tx_category_date ON finance_transactions(category_id, occurred_at);
        CREATE TABLE IF NOT EXISTS finance_recurring (
          id TEXT PRIMARY KEY,
          template_json TEXT NOT NULL,
          rrule TEXT NOT NULL,
          next_run TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS finance_budgets (
          id TEXT PRIMARY KEY,
          category_id TEXT NOT NULL,
          period TEXT NOT NULL DEFAULT 'monthly',
          limit_amount INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'UYU',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (category_id, period, currency),
          FOREIGN KEY (category_id) REFERENCES finance_categories(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS finance_merchant_aliases (
          id TEXT PRIMARY KEY,
          pattern TEXT NOT NULL,
          category_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (category_id) REFERENCES finance_categories(id) ON DELETE SET NULL
        );
      `,
    },
    {
      version: 2,
      up: `
        INSERT OR IGNORE INTO finance_categories (id, name, parent_id, kind, color, archived) VALUES
          ('cat_food', 'Comida', NULL, 'expense', NULL, 0),
          ('cat_transport', 'Transporte', NULL, 'expense', NULL, 0),
          ('cat_home', 'Hogar', NULL, 'expense', NULL, 0),
          ('cat_health', 'Salud', NULL, 'expense', NULL, 0),
          ('cat_entertainment', 'Ocio', NULL, 'expense', NULL, 0),
          ('cat_subscriptions', 'Suscripciones', NULL, 'expense', NULL, 0),
          ('cat_other_exp', 'Otros gastos', NULL, 'expense', NULL, 0),
          ('cat_salary', 'Sueldo', NULL, 'income', NULL, 0),
          ('cat_other_inc', 'Otros ingresos', NULL, 'income', NULL, 0);
      `,
    },
  ],

  widgets: [
    {
      id: 'finance-summary',
      pluginId: 'finance',
      title: 'Finanzas',
      component: FinanceSummaryWidget,
      defaultSize: { w: 1, h: 1 },
    },
  ],

  pages: [
    { id: 'finance-dashboard', pluginId: 'finance', path: '/finance', title: 'Finanzas', icon: 'Wallet', component: FinanceDashboard },
    { id: 'finance-tx', pluginId: 'finance', path: '/finance/transactions', title: 'Movimientos', icon: 'Receipt', component: TransactionsPage },
    { id: 'finance-cat', pluginId: 'finance', path: '/finance/categories', title: 'Categorías', icon: 'Tag', component: CategoriesPage },
    { id: 'finance-bud', pluginId: 'finance', path: '/finance/budgets', title: 'Presupuestos', icon: 'BarChart3', component: BudgetsPage },
    { id: 'finance-rec', pluginId: 'finance', path: '/finance/recurring', title: 'Recurrentes', icon: 'Repeat', component: RecurringPage },
    { id: 'finance-ins', pluginId: 'finance', path: '/finance/insights', title: 'Insights', icon: 'LineChart', component: InsightsPage },
  ],

  navItems: [
    { id: 'finance-nav', pluginId: 'finance', label: 'Finanzas', icon: 'Wallet', path: '/finance', order: 30 },
    { id: 'finance-tx-nav', pluginId: 'finance', label: 'Movimientos', icon: 'Receipt', path: '/finance/transactions', order: 31, parentId: 'finance-nav' },
    { id: 'finance-bud-nav', pluginId: 'finance', label: 'Presupuestos', icon: 'BarChart3', path: '/finance/budgets', order: 32, parentId: 'finance-nav' },
    { id: 'finance-rec-nav', pluginId: 'finance', label: 'Recurrentes', icon: 'Repeat', path: '/finance/recurring', order: 33, parentId: 'finance-nav' },
    { id: 'finance-cat-nav', pluginId: 'finance', label: 'Categorías', icon: 'Tag', path: '/finance/categories', order: 34, parentId: 'finance-nav' },
    { id: 'finance-ins-nav', pluginId: 'finance', label: 'Insights', icon: 'LineChart', path: '/finance/insights', order: 35, parentId: 'finance-nav' },
  ],

  events: {
    emits: Object.values(FINANCE_EVENTS),
    listens: [],
  },

  async init(api: CoreAPI) {
    const accountsRaw = await api.storage.query('SELECT * FROM finance_accounts ORDER BY created_at ASC')
    const categoriesRaw = await api.storage.query('SELECT * FROM finance_categories ORDER BY name ASC')
    const transactionsRaw = await api.storage.query('SELECT * FROM finance_transactions ORDER BY occurred_at DESC, created_at DESC')
    const recurringRaw = await api.storage.query('SELECT * FROM finance_recurring ORDER BY next_run ASC')
    const budgetsRaw = await api.storage.query('SELECT * FROM finance_budgets ORDER BY created_at ASC')

    const accounts: Account[] = (accountsRaw as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      type: row.type as Account['type'],
      currency: row.currency as string,
      initialBalance: Number(row.initial_balance ?? 0),
      archived: Boolean(row.archived),
      createdAt: row.created_at as string,
    }))

    const categories: Category[] = (categoriesRaw as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      parentId: (row.parent_id ?? null) as string | null,
      kind: (row.kind ?? 'expense') as Category['kind'],
      color: (row.color ?? null) as string | null,
      archived: Boolean(row.archived),
    }))

    const transactions: Transaction[] = (transactionsRaw as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      accountId: row.account_id as string,
      categoryId: (row.category_id ?? null) as string | null,
      kind: row.kind as Transaction['kind'],
      amount: Number(row.amount ?? 0),
      currency: row.currency as string,
      occurredAt: row.occurred_at as string,
      note: (row.note ?? null) as string | null,
      recurringId: (row.recurring_id ?? null) as string | null,
      transferPairId: (row.transfer_pair_id ?? null) as string | null,
      createdAt: row.created_at as string,
    }))

    const recurring: Recurring[] = (recurringRaw as Record<string, unknown>[]).map((row) => {
      let template: RecurringTemplate
      try {
        template = JSON.parse(row.template_json as string) as RecurringTemplate
      } catch {
        // fallback defensivo: marcar inactiva si JSON inválido
        template = { accountId: '', categoryId: null, kind: 'expense', amount: 0, currency: 'UYU', note: null }
      }
      return {
        id: row.id as string,
        template,
        rrule: row.rrule as string,
        nextRun: row.next_run as string,
        active: Boolean(row.active),
        createdAt: row.created_at as string,
      }
    })

    const budgets: Budget[] = (budgetsRaw as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      categoryId: row.category_id as string,
      period: 'monthly',
      limitAmount: Number(row.limit_amount ?? 0),
      currency: row.currency as string,
      createdAt: row.created_at as string,
    }))

    const store = useFinanceStore.getState()
    store.setAccounts(accounts)
    store.setCategories(categories)
    store.setTransactions(transactions)
    store.setRecurring(recurring)
    store.setBudgets(budgets)

    // AI context provider (decoupled)
    registerAIContextProvider(financeAIProvider)

    // Materializar recurrentes atrasadas (best-effort, no bloquear init)
    void runRecurringEngine().catch((err) => console.warn('[finance] recurring engine error:', err))

    // Anomaly detection sobre cada transacción nueva.
    api.events.on(FINANCE_EVENTS.TRANSACTION_CREATED, (payload) => {
      const id = (payload as { id?: string } | null)?.id
      if (!id) return
      const anomaly = detectAnomaly(id)
      if (anomaly) {
        eventBus.emit(
          FINANCE_EVENTS.ANOMALY_DETECTED,
          { txId: anomaly.txId, categoryName: anomaly.categoryName, amountCents: anomaly.amountCents, ratio: anomaly.ratio },
          { source: 'finance', persist: true },
        )
      }
    })

    // Gamificación
    api.events.on(FINANCE_EVENTS.TRANSACTION_CREATED, () => {
      api.gamification.addPoints(2, 'Movimiento registrado')
    })
    api.events.on(FINANCE_EVENTS.RECURRING_CREATED, () => {
      api.gamification.addPoints(5, 'Recurrente configurada')
    })
    api.events.on(FINANCE_EVENTS.BUDGET_CREATED, () => {
      api.gamification.addPoints(5, 'Presupuesto definido')
    })
  },
}

registerPlugin(financePlugin)

export default financePlugin
