/**
 * Operaciones CRUD de Finance. Cada operación:
 *  - Persiste a SQLite via window.storage.execute.
 *  - Actualiza el store Zustand.
 *  - Emite el evento correspondiente vía eventBus (con persist=true).
 *
 * Mantenemos lógica fuera de los componentes para que las pages sean delgadas.
 */

import { eventBus } from '@core/events/EventBus'
import { useFinanceStore } from './store'
import { FINANCE_EVENTS } from './events'
import { genId, materializeRecurring, todayISO } from './utils'
import type {
  Account,
  Category,
  Transaction,
  Recurring,
  RecurringTemplate,
  Budget,
  TransactionKind,
  AccountType,
  CategoryKind,
} from './types'

function exec(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
  if (!window.storage) return Promise.resolve({ changes: 0, lastInsertRowid: 0 })
  return window.storage.execute(sql, params)
}

// ─── Accounts ────────────────────────────────────────────────────────

export interface CreateAccountInput {
  name: string
  type: AccountType
  currency?: string
  initialBalance?: number
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const account: Account = {
    id: genId('acc'),
    name: input.name.trim(),
    type: input.type,
    currency: (input.currency ?? 'UYU').toUpperCase(),
    initialBalance: input.initialBalance ?? 0,
    archived: false,
    createdAt: new Date().toISOString(),
  }
  await exec(
    `INSERT INTO finance_accounts (id, name, type, currency, initial_balance, archived, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [account.id, account.name, account.type, account.currency, account.initialBalance, account.createdAt],
  )
  useFinanceStore.getState().upsertAccount(account)
  eventBus.emit(FINANCE_EVENTS.ACCOUNT_CREATED, { id: account.id, name: account.name }, { source: 'finance', persist: true })
  return account
}

export async function updateAccount(id: string, patch: Partial<Pick<Account, 'name' | 'type' | 'currency' | 'initialBalance'>>): Promise<void> {
  const existing = useFinanceStore.getState().accounts.find((a) => a.id === id)
  if (!existing) return
  const next: Account = { ...existing, ...patch }
  await exec(
    `UPDATE finance_accounts SET name = ?, type = ?, currency = ?, initial_balance = ? WHERE id = ?`,
    [next.name, next.type, next.currency, next.initialBalance, id],
  )
  useFinanceStore.getState().upsertAccount(next)
  eventBus.emit(FINANCE_EVENTS.ACCOUNT_UPDATED, { id }, { source: 'finance', persist: true })
}

export async function archiveAccount(id: string): Promise<void> {
  await exec(`UPDATE finance_accounts SET archived = 1 WHERE id = ?`, [id])
  const existing = useFinanceStore.getState().accounts.find((a) => a.id === id)
  if (existing) useFinanceStore.getState().upsertAccount({ ...existing, archived: true })
  eventBus.emit(FINANCE_EVENTS.ACCOUNT_ARCHIVED, { id }, { source: 'finance', persist: true })
}

// ─── Categories ──────────────────────────────────────────────────────

export interface CreateCategoryInput {
  name: string
  kind: CategoryKind
  parentId?: string | null
  color?: string | null
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const cat: Category = {
    id: genId('cat'),
    name: input.name.trim(),
    parentId: input.parentId ?? null,
    kind: input.kind,
    color: input.color ?? null,
    archived: false,
  }
  await exec(
    `INSERT INTO finance_categories (id, name, parent_id, kind, color, archived) VALUES (?, ?, ?, ?, ?, 0)`,
    [cat.id, cat.name, cat.parentId, cat.kind, cat.color],
  )
  useFinanceStore.getState().upsertCategory(cat)
  eventBus.emit(FINANCE_EVENTS.CATEGORY_CREATED, { id: cat.id, name: cat.name }, { source: 'finance', persist: true })
  return cat
}

export async function updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'parentId' | 'color' | 'kind'>>): Promise<void> {
  const existing = useFinanceStore.getState().categories.find((c) => c.id === id)
  if (!existing) return
  const next: Category = { ...existing, ...patch }
  await exec(
    `UPDATE finance_categories SET name = ?, parent_id = ?, kind = ?, color = ? WHERE id = ?`,
    [next.name, next.parentId, next.kind, next.color, id],
  )
  useFinanceStore.getState().upsertCategory(next)
  eventBus.emit(FINANCE_EVENTS.CATEGORY_UPDATED, { id }, { source: 'finance', persist: true })
}

export async function deleteCategory(id: string): Promise<void> {
  await exec(`DELETE FROM finance_categories WHERE id = ?`, [id])
  useFinanceStore.getState().removeCategory(id)
  eventBus.emit(FINANCE_EVENTS.CATEGORY_DELETED, { id }, { source: 'finance', persist: true })
}

// ─── Transactions ────────────────────────────────────────────────────

export interface CreateTransactionInput {
  accountId: string
  categoryId: string | null
  kind: TransactionKind
  amount: number  // centavos
  currency?: string
  occurredAt?: string
  note?: string | null
  recurringId?: string | null
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  if (input.amount <= 0) throw new Error('Monto inválido. Debe ser mayor a 0.')
  const account = useFinanceStore.getState().accounts.find((a) => a.id === input.accountId)
  if (!account) throw new Error('Cuenta inválida.')

  const tx: Transaction = {
    id: genId('tx'),
    accountId: input.accountId,
    categoryId: input.categoryId,
    kind: input.kind,
    amount: input.amount,
    currency: (input.currency ?? account.currency).toUpperCase(),
    occurredAt: input.occurredAt ?? todayISO(),
    note: input.note ?? null,
    recurringId: input.recurringId ?? null,
    transferPairId: null,
    createdAt: new Date().toISOString(),
  }
  await exec(
    `INSERT INTO finance_transactions
       (id, account_id, category_id, kind, amount, currency, occurred_at, note, recurring_id, transfer_pair_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    [tx.id, tx.accountId, tx.categoryId, tx.kind, tx.amount, tx.currency, tx.occurredAt, tx.note, tx.recurringId, tx.createdAt],
  )
  useFinanceStore.getState().upsertTransaction(tx)
  eventBus.emit(
    FINANCE_EVENTS.TRANSACTION_CREATED,
    { id: tx.id, amount: tx.amount, kind: tx.kind, categoryId: tx.categoryId, accountId: tx.accountId },
    { source: 'finance', persist: true },
  )
  return tx
}

export async function deleteTransaction(id: string): Promise<void> {
  const tx = useFinanceStore.getState().transactions.find((t) => t.id === id)
  if (!tx) return
  // Si tiene par (transfer), borrar también la contraparte.
  if (tx.transferPairId) {
    await exec(`DELETE FROM finance_transactions WHERE id = ?`, [tx.transferPairId])
    useFinanceStore.getState().removeTransaction(tx.transferPairId)
  }
  await exec(`DELETE FROM finance_transactions WHERE id = ?`, [id])
  useFinanceStore.getState().removeTransaction(id)
  eventBus.emit(FINANCE_EVENTS.TRANSACTION_DELETED, { id }, { source: 'finance', persist: true })
}

export async function updateTransaction(
  id: string,
  patch: Partial<Pick<Transaction, 'amount' | 'categoryId' | 'note' | 'occurredAt'>>,
): Promise<void> {
  const existing = useFinanceStore.getState().transactions.find((t) => t.id === id)
  if (!existing) return
  const next: Transaction = { ...existing, ...patch }
  await exec(
    `UPDATE finance_transactions SET amount = ?, category_id = ?, note = ?, occurred_at = ? WHERE id = ?`,
    [next.amount, next.categoryId, next.note, next.occurredAt, id],
  )
  useFinanceStore.getState().upsertTransaction(next)
  eventBus.emit(FINANCE_EVENTS.TRANSACTION_UPDATED, { id }, { source: 'finance', persist: true })
}

/**
 * Transferencia entre cuentas. Genera dos transactions con el mismo monto y
 * `transferPairId` cruzado: la de salida es expense en la cuenta origen y la
 * de entrada es income en la cuenta destino. Sin afectar P&L global.
 */
export async function createTransfer(input: {
  fromAccountId: string
  toAccountId: string
  amount: number
  occurredAt?: string
  note?: string | null
}): Promise<{ outgoing: Transaction; incoming: Transaction }> {
  if (input.fromAccountId === input.toAccountId) throw new Error('Cuentas distintas requeridas.')
  if (input.amount <= 0) throw new Error('Monto inválido.')
  const from = useFinanceStore.getState().accounts.find((a) => a.id === input.fromAccountId)
  const to = useFinanceStore.getState().accounts.find((a) => a.id === input.toAccountId)
  if (!from || !to) throw new Error('Cuentas inválidas.')

  const occurredAt = input.occurredAt ?? todayISO()
  const createdAt = new Date().toISOString()
  const outId = genId('tx')
  const inId = genId('tx')

  const outgoing: Transaction = {
    id: outId,
    accountId: from.id,
    categoryId: null,
    kind: 'transfer',
    amount: input.amount,
    currency: from.currency,
    occurredAt,
    note: input.note ?? null,
    recurringId: null,
    transferPairId: inId,
    createdAt,
  }
  const incoming: Transaction = {
    id: inId,
    accountId: to.id,
    categoryId: null,
    kind: 'transfer',
    amount: input.amount,
    currency: to.currency,
    occurredAt,
    note: input.note ?? null,
    recurringId: null,
    transferPairId: outId,
    // Creado un milisegundo después para que la convención de "incoming = más nuevo" se mantenga.
    createdAt: new Date(Date.parse(createdAt) + 1).toISOString(),
  }

  await exec(
    `INSERT INTO finance_transactions
       (id, account_id, category_id, kind, amount, currency, occurred_at, note, recurring_id, transfer_pair_id, created_at)
     VALUES (?, ?, NULL, 'transfer', ?, ?, ?, ?, NULL, ?, ?)`,
    [outgoing.id, outgoing.accountId, outgoing.amount, outgoing.currency, outgoing.occurredAt, outgoing.note, incoming.id, outgoing.createdAt],
  )
  await exec(
    `INSERT INTO finance_transactions
       (id, account_id, category_id, kind, amount, currency, occurred_at, note, recurring_id, transfer_pair_id, created_at)
     VALUES (?, ?, NULL, 'transfer', ?, ?, ?, ?, NULL, ?, ?)`,
    [incoming.id, incoming.accountId, incoming.amount, incoming.currency, incoming.occurredAt, incoming.note, outgoing.id, incoming.createdAt],
  )
  useFinanceStore.getState().upsertTransactions([outgoing, incoming])
  eventBus.emit(
    FINANCE_EVENTS.TRANSFER_CREATED,
    { from: from.id, to: to.id, amount: input.amount },
    { source: 'finance', persist: true },
  )
  return { outgoing, incoming }
}

// ─── Recurring ───────────────────────────────────────────────────────

export async function createRecurring(input: {
  template: RecurringTemplate
  rrule: string
  nextRun: string
}): Promise<Recurring> {
  const rec: Recurring = {
    id: genId('rec'),
    template: input.template,
    rrule: input.rrule,
    nextRun: input.nextRun,
    active: true,
    createdAt: new Date().toISOString(),
  }
  await exec(
    `INSERT INTO finance_recurring (id, template_json, rrule, next_run, active, created_at)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [rec.id, JSON.stringify(rec.template), rec.rrule, rec.nextRun, rec.createdAt],
  )
  useFinanceStore.getState().upsertRecurring(rec)
  eventBus.emit(FINANCE_EVENTS.RECURRING_CREATED, { id: rec.id }, { source: 'finance', persist: true })
  return rec
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  await exec(`UPDATE finance_recurring SET active = ? WHERE id = ?`, [active ? 1 : 0, id])
  const existing = useFinanceStore.getState().recurring.find((r) => r.id === id)
  if (existing) useFinanceStore.getState().upsertRecurring({ ...existing, active })
  eventBus.emit(FINANCE_EVENTS.RECURRING_UPDATED, { id, active }, { source: 'finance', persist: true })
}

/**
 * Materializa todas las recurrencias activas atrasadas. Se ejecuta al activar
 * el plugin (en `init`) y se puede invocar manualmente desde la UI. No corre
 * en background: respeta filosofía local-first sin scheduler.
 */
export async function runRecurringEngine(): Promise<number> {
  const today = todayISO()
  const recs = useFinanceStore.getState().recurring.filter((r) => r.active)
  let created = 0
  for (const rec of recs) {
    const { toCreate, nextRun } = materializeRecurring(rec, today)
    if (toCreate.length === 0) continue
    for (const occ of toCreate) {
      try {
        await createTransaction({
          accountId: occ.template.accountId,
          categoryId: occ.template.categoryId,
          kind: occ.template.kind,
          amount: occ.template.amount,
          currency: occ.template.currency,
          occurredAt: occ.occurredAt,
          note: occ.template.note,
          recurringId: rec.id,
        })
        created += 1
      } catch (err) {
        console.warn(`[finance] no pude materializar recurrencia ${rec.id}:`, err)
      }
    }
    await exec(`UPDATE finance_recurring SET next_run = ? WHERE id = ?`, [nextRun, rec.id])
    useFinanceStore.getState().upsertRecurring({ ...rec, nextRun })
  }
  if (created > 0) {
    eventBus.emit(FINANCE_EVENTS.RECURRING_MATERIALIZED, { count: created }, { source: 'finance', persist: true })
  }
  return created
}

// ─── Budgets ─────────────────────────────────────────────────────────

export async function upsertBudget(input: { categoryId: string; limitAmount: number; currency: string }): Promise<Budget> {
  const existing = useFinanceStore
    .getState()
    .budgets.find((b) => b.categoryId === input.categoryId && b.currency === input.currency.toUpperCase())
  if (existing) {
    await exec(
      `UPDATE finance_budgets SET limit_amount = ? WHERE id = ?`,
      [input.limitAmount, existing.id],
    )
    const next: Budget = { ...existing, limitAmount: input.limitAmount }
    useFinanceStore.getState().upsertBudget(next)
    eventBus.emit(FINANCE_EVENTS.BUDGET_UPDATED, { id: next.id }, { source: 'finance', persist: true })
    return next
  }
  const budget: Budget = {
    id: genId('bud'),
    categoryId: input.categoryId,
    period: 'monthly',
    limitAmount: input.limitAmount,
    currency: input.currency.toUpperCase(),
    createdAt: new Date().toISOString(),
  }
  await exec(
    `INSERT INTO finance_budgets (id, category_id, period, limit_amount, currency, created_at)
     VALUES (?, ?, 'monthly', ?, ?, ?)`,
    [budget.id, budget.categoryId, budget.limitAmount, budget.currency, budget.createdAt],
  )
  useFinanceStore.getState().upsertBudget(budget)
  eventBus.emit(FINANCE_EVENTS.BUDGET_CREATED, { id: budget.id }, { source: 'finance', persist: true })
  return budget
}

export async function deleteBudget(id: string): Promise<void> {
  await exec(`DELETE FROM finance_budgets WHERE id = ?`, [id])
  useFinanceStore.getState().removeBudget(id)
  eventBus.emit(FINANCE_EVENTS.BUDGET_DELETED, { id }, { source: 'finance', persist: true })
}
