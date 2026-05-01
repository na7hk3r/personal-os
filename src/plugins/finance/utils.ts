import type { Transaction, Recurring, RecurringTemplate, Account, Category } from './types'

/**
 * Helpers puros para Finance. Sin dependencias de stores ni de IO.
 * Mantener idempotentes y testeables.
 */

export const CENTS_PER_UNIT = 100

/** Convierte un input de usuario (ej. "12.50") a centavos enteros. */
export function parseAmountToCents(input: string | number): number {
  const raw = typeof input === 'number' ? input.toString() : input.trim()
  if (!raw) return 0
  const cleaned = raw.replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  const value = Number.parseFloat(cleaned)
  if (!Number.isFinite(value)) return 0
  return Math.round(value * CENTS_PER_UNIT)
}

export function formatCents(cents: number, currency: string = 'UYU', opts?: { compact?: boolean }): string {
  const value = cents / CENTS_PER_UNIT
  try {
    if (opts?.compact && Math.abs(value) >= 1000) {
      return new Intl.NumberFormat('es-UY', {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value)
    }
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export function todayISO(): string {
  const d = new Date()
  return formatLocalDate(d)
}

export function formatLocalDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function previousMonth(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  const end = new Date(date.getFullYear(), date.getMonth(), 0)
  return { start, end }
}

/**
 * Calcula el saldo actual de una cuenta a partir del initialBalance + transacciones.
 * Convención de signos: income suma, expense resta. Transfer no afecta P&L global,
 * pero sí afecta el saldo de cada cuenta participante (representado como dos
 * transacciones con `transferPairId` cruzado, una income y una expense).
 */
export function computeAccountBalance(account: Account, transactions: Transaction[]): number {
  const own = transactions.filter((t) => t.accountId === account.id)
  let balance = account.initialBalance
  for (const t of own) {
    if (t.kind === 'income') balance += t.amount
    else if (t.kind === 'expense') balance -= t.amount
    else if (t.kind === 'transfer') {
      // Para transfers se modela como dos rows: una positiva (entrada) y otra
      // negativa (salida), ambas con kind='transfer'. El "lado" se distingue
      // por si la transacción fue creada antes o después de la par.
      // Para simplificar: el lado de salida no tiene transferPairId nulo y el
      // de entrada apunta al de salida.
      balance += isIncomingTransfer(t, transactions) ? t.amount : -t.amount
    }
  }
  return balance
}

/** Una transferencia es "entrante" si su par es la salida (creada primero). */
function isIncomingTransfer(t: Transaction, all: Transaction[]): boolean {
  if (!t.transferPairId) return false
  const pair = all.find((x) => x.id === t.transferPairId)
  if (!pair) return false
  // Convención: el row de salida es el "primario" (creado primero). El de
  // entrada referencia al de salida via transferPairId.
  return new Date(t.createdAt).getTime() >= new Date(pair.createdAt).getTime()
}

/**
 * Subset RFC5545 soportado:
 *   FREQ=DAILY[;INTERVAL=N]
 *   FREQ=WEEKLY[;INTERVAL=N][;BYDAY=MO,TU,...]
 *   FREQ=MONTHLY[;INTERVAL=N][;BYMONTHDAY=N]
 */
const DAYS_OF_WEEK: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
}

interface ParsedRRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  interval: number
  byDay?: number[]
  byMonthDay?: number
}

export function parseRRule(rrule: string): ParsedRRule | null {
  const parts = rrule.split(';').reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split('=')
    if (k && v) acc[k.toUpperCase()] = v.toUpperCase()
    return acc
  }, {})
  const freq = parts.FREQ as ParsedRRule['freq']
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(freq)) return null
  const interval = parts.INTERVAL ? Math.max(1, Number.parseInt(parts.INTERVAL, 10) || 1) : 1
  const byDay = parts.BYDAY
    ? parts.BYDAY.split(',').map((d) => DAYS_OF_WEEK[d]).filter((n) => n !== undefined)
    : undefined
  const byMonthDay = parts.BYMONTHDAY ? Number.parseInt(parts.BYMONTHDAY, 10) : undefined
  return { freq, interval, byDay, byMonthDay }
}

/** Avanza una fecha al próximo run según la regla. Devuelve string YYYY-MM-DD. */
export function nextRunDate(rrule: string, from: string): string {
  const parsed = parseRRule(rrule)
  if (!parsed) return from
  const base = new Date(`${from}T00:00:00`)
  const next = new Date(base)

  if (parsed.freq === 'DAILY') {
    next.setDate(next.getDate() + parsed.interval)
  } else if (parsed.freq === 'WEEKLY') {
    if (parsed.byDay && parsed.byDay.length > 0) {
      // Buscar el próximo day-of-week que matchee, dentro de las próximas 4 semanas
      for (let i = 1; i <= 28; i++) {
        const candidate = new Date(base)
        candidate.setDate(candidate.getDate() + i)
        if (parsed.byDay.includes(candidate.getDay())) {
          return formatLocalDate(candidate)
        }
      }
    }
    next.setDate(next.getDate() + 7 * parsed.interval)
  } else if (parsed.freq === 'MONTHLY') {
    next.setMonth(next.getMonth() + parsed.interval)
    if (parsed.byMonthDay) {
      // Cap al último día del mes destino
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(parsed.byMonthDay, lastDay))
    }
  }
  return formatLocalDate(next)
}

/**
 * Materializa todas las ocurrencias atrasadas de una recurrente hasta hoy.
 * Devuelve la lista de transacciones a crear y el siguiente nextRun.
 * No persiste; el caller decide.
 */
export function materializeRecurring(rec: Recurring, today: string = todayISO()): {
  toCreate: Array<{ template: RecurringTemplate; occurredAt: string }>
  nextRun: string
} {
  const toCreate: Array<{ template: RecurringTemplate; occurredAt: string }> = []
  let cursor = rec.nextRun
  // Guard contra loops infinitos: máx 366 ocurrencias por materialización.
  let safety = 366
  while (cursor <= today && safety > 0) {
    toCreate.push({ template: rec.template, occurredAt: cursor })
    cursor = nextRunDate(rec.rrule, cursor)
    safety -= 1
  }
  return { toCreate, nextRun: cursor }
}

/**
 * P90 de los gastos de una categoría en los últimos N días, en centavos.
 * Devuelve null si hay menos de 5 muestras (no significativo).
 */
export function categoryP90(transactions: Transaction[], categoryId: string, days = 90): number | null {
  const since = Date.now() - days * 86_400_000
  const samples = transactions
    .filter((t) => t.categoryId === categoryId && t.kind === 'expense')
    .filter((t) => new Date(t.occurredAt).getTime() >= since)
    .map((t) => t.amount)
    .sort((a, b) => a - b)
  if (samples.length < 5) return null
  const idx = Math.floor(samples.length * 0.9)
  return samples[Math.min(idx, samples.length - 1)] ?? null
}

/**
 * Mediana de gasto mensual de una categoría en los últimos N meses.
 * Resistente a outliers (preferida sobre media para presupuesto sugerido).
 */
export function monthlySpendMedian(transactions: Transaction[], categoryId: string, months = 3): number | null {
  const now = new Date()
  const buckets: number[] = []
  for (let i = 1; i <= months; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const total = transactions
      .filter((t) => t.categoryId === categoryId && t.kind === 'expense')
      .filter((t) => {
        const d = new Date(t.occurredAt)
        return d >= monthStart && d <= monthEnd
      })
      .reduce((acc, t) => acc + t.amount, 0)
    buckets.push(total)
  }
  if (buckets.length === 0) return null
  const sorted = [...buckets].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

/** Construye árbol jerárquico de categorías (max 2 niveles). */
export function buildCategoryTree(categories: Category[]): Array<Category & { children: Category[] }> {
  const roots: Array<Category & { children: Category[] }> = []
  const byId = new Map(categories.map((c) => [c.id, { ...c, children: [] as Category[] }]))
  for (const cat of byId.values()) {
    if (cat.parentId && byId.has(cat.parentId)) {
      byId.get(cat.parentId)!.children.push(cat)
    } else {
      roots.push(cat)
    }
  }
  return roots
}

export function genId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
