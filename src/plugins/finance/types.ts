export type AccountType = 'cash' | 'bank' | 'card' | 'wallet'
export type TransactionKind = 'income' | 'expense' | 'transfer'
export type CategoryKind = 'income' | 'expense'

export interface Account {
  id: string
  name: string
  type: AccountType
  /** Código ISO 4217. Default ARS. */
  currency: string
  /** Saldo inicial en centavos. */
  initialBalance: number
  archived: boolean
  createdAt: string
}

export interface Category {
  id: string
  name: string
  /** id de la categoría padre (max 2 niveles). */
  parentId: string | null
  kind: CategoryKind
  color: string | null
  archived: boolean
}

export interface Transaction {
  id: string
  accountId: string
  categoryId: string | null
  kind: TransactionKind
  /** Monto en centavos, siempre positivo. El signo lo da `kind`. */
  amount: number
  currency: string
  /** Fecha en formato YYYY-MM-DD. */
  occurredAt: string
  note: string | null
  recurringId: string | null
  /** Si es transfer, id de la transacción par (en la otra cuenta). */
  transferPairId: string | null
  createdAt: string
}

/**
 * Plantilla almacenada como JSON en `finance_recurring.template_json`.
 * No incluye id ni occurredAt: se generan al materializar.
 */
export interface RecurringTemplate {
  accountId: string
  categoryId: string | null
  kind: TransactionKind
  amount: number
  currency: string
  note: string | null
}

export interface Recurring {
  id: string
  template: RecurringTemplate
  /** Subset de RFC5545. Soportado: FREQ=DAILY|WEEKLY|MONTHLY[;INTERVAL=N][;BYMONTHDAY=N][;BYDAY=MO..SU]. */
  rrule: string
  /** Próxima fecha de ejecución (YYYY-MM-DD). */
  nextRun: string
  active: boolean
  createdAt: string
}

export interface Budget {
  id: string
  categoryId: string
  period: 'monthly'
  /** Límite en centavos. */
  limitAmount: number
  currency: string
  createdAt: string
}
