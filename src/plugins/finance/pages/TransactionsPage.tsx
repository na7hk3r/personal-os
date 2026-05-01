import { useMemo, useRef, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useFinanceStore } from '../store'
import { deleteTransaction } from '../operations'
import { formatCents, formatLocalDate, startOfMonth, previousMonth } from '../utils'
import { useToast } from '@core/ui/components/ToastProvider'
import { messages } from '@core/ui/messages'

type RangePreset = 'this-month' | 'last-month' | 'last-90' | 'all'

export function TransactionsPage() {
  const accounts = useFinanceStore((s) => s.accounts)
  const categories = useFinanceStore((s) => s.categories)
  const transactions = useFinanceStore((s) => s.transactions)
  const { toast } = useToast()

  const [range, setRange] = useState<RangePreset>('this-month')
  const [accountId, setAccountId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all')

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const rangeBounds = useMemo(() => {
    const today = new Date()
    if (range === 'this-month') return { start: formatLocalDate(startOfMonth()), end: formatLocalDate(today) }
    if (range === 'last-month') {
      const p = previousMonth()
      return { start: formatLocalDate(p.start), end: formatLocalDate(p.end) }
    }
    if (range === 'last-90') {
      return { start: formatLocalDate(new Date(Date.now() - 90 * 86_400_000)), end: formatLocalDate(today) }
    }
    return { start: '0000-01-01', end: '9999-12-31' }
  }, [range])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transactions
      .filter((t) => t.occurredAt >= rangeBounds.start && t.occurredAt <= rangeBounds.end)
      .filter((t) => (accountId ? t.accountId === accountId : true))
      .filter((t) => (categoryId ? t.categoryId === categoryId : true))
      .filter((t) => (kindFilter === 'all' ? true : t.kind === kindFilter))
      .filter((t) => {
        if (!q) return true
        const cat = t.categoryId ? categoryById.get(t.categoryId)?.name?.toLowerCase() ?? '' : ''
        const note = t.note?.toLowerCase() ?? ''
        return cat.includes(q) || note.includes(q)
      })
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : a.createdAt < b.createdAt ? 1 : -1))
  }, [transactions, rangeBounds, accountId, categoryId, kindFilter, search, categoryById])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of filtered) {
      if (t.kind === 'income') income += t.amount
      else if (t.kind === 'expense') expense += t.amount
    }
    return { income, expense }
  }, [filtered])

  const onDelete = async (id: string) => {
    try {
      await deleteTransaction(id)
      toast.success(messages.success.financeTransactionDeleted ?? 'Movimiento borrado.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-border bg-surface-light/90 p-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <SegPreset value={range} onChange={setRange} options={[
            { v: 'this-month', l: 'Este mes' },
            { v: 'last-month', l: 'Mes pasado' },
            { v: 'last-90', l: '90 días' },
            { v: 'all', l: 'Todo' },
          ]} />
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-white">
            <option value="">Todas las cuentas</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-white">
            <option value="">Todas las categorías</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <SegPreset value={kindFilter} onChange={setKindFilter} options={[
            { v: 'all', l: 'Todo' },
            { v: 'income', l: 'Ingresos' },
            { v: 'expense', l: 'Gastos' },
            { v: 'transfer', l: 'Transfer' },
          ]} />
          <label className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5">
            <Search size={12} className="text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nota o categoría"
              className="w-44 bg-transparent text-white outline-none placeholder:text-muted"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted">
          <span>{filtered.length} movimientos</span>
          <span className="text-emerald-300">+ {formatCents(totals.income)}</span>
          <span className="text-rose-300">− {formatCents(totals.expense)}</span>
          <span className="text-white">Neto {formatCents(totals.income - totals.expense)}</span>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-surface-light/90 shadow-xl">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted">{messages.empty.financeTransactions}</p>
        ) : filtered.length > 50 ? (
          <VirtualizedTxList
            transactions={filtered}
            categoryById={categoryById}
            accountById={accountById}
            onDelete={onDelete}
          />
        ) : (
          <ul className="max-h-[60vh] divide-y divide-border/40 overflow-y-auto">
            {filtered.map((t) => {
              const cat = t.categoryId ? categoryById.get(t.categoryId) : null
              const acc = accountById.get(t.accountId)
              return (
                <li key={t.id} className="grid grid-cols-[80px_1fr_auto_auto_auto] items-center gap-3 px-4 py-2 text-sm">
                  <span className="text-xs text-muted">{t.occurredAt}</span>
                  <div className="min-w-0">
                    <p className="truncate text-white">{cat?.name ?? (t.kind === 'transfer' ? 'Transferencia' : 'Sin categoría')}</p>
                    {t.note && <p className="truncate text-xs text-muted">{t.note}</p>}
                  </div>
                  <span className="text-xs text-muted">{acc?.name}</span>
                  <span className={`font-mono text-sm ${t.kind === 'income' ? 'text-emerald-200' : t.kind === 'expense' ? 'text-rose-200' : 'text-muted'}`}>
                    {t.kind === 'income' ? '+' : t.kind === 'expense' ? '−' : '↔'} {formatCents(t.amount, t.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void onDelete(t.id)}
                    className="rounded p-1 text-muted hover:text-rose-300"
                    aria-label="Borrar"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function SegPreset<T extends string>({ value, onChange, options }: {
  value: T
  onChange: (v: T) => void
  options: Array<{ v: T; l: string }>
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-md px-2 py-1 text-xs ${value === o.v ? 'bg-accent/20 text-accent-light' : 'text-muted hover:text-white'}`}
        >{o.l}</button>
      ))}
    </div>
  )
}

import type { Transaction, Account, Category } from '../types'

function VirtualizedTxList({
  transactions,
  categoryById,
  accountById,
  onDelete,
}: {
  transactions: Transaction[]
  categoryById: Map<string, Category>
  accountById: Map<string, Account>
  onDelete: (id: string) => Promise<void>
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 8,
  })

  return (
    <div ref={parentRef} className="max-h-[60vh] overflow-y-auto">
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const t = transactions[virtualRow.index]
          if (!t) return null
          const cat = t.categoryId ? categoryById.get(t.categoryId) : null
          const acc = accountById.get(t.accountId)
          return (
            <div
              key={t.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-[80px_1fr_auto_auto_auto] items-center gap-3 border-b border-border/40 px-4 py-2 text-sm"
            >
              <span className="text-xs text-muted">{t.occurredAt}</span>
              <div className="min-w-0">
                <p className="truncate text-white">{cat?.name ?? (t.kind === 'transfer' ? 'Transferencia' : 'Sin categoría')}</p>
                {t.note && <p className="truncate text-xs text-muted">{t.note}</p>}
              </div>
              <span className="text-xs text-muted">{acc?.name}</span>
              <span className={`font-mono text-sm ${t.kind === 'income' ? 'text-emerald-200' : t.kind === 'expense' ? 'text-rose-200' : 'text-muted'}`}>
                {t.kind === 'income' ? '+' : t.kind === 'expense' ? '−' : '↔'} {formatCents(t.amount, t.currency)}
              </span>
              <button
                type="button"
                onClick={() => void onDelete(t.id)}
                className="rounded p-1 text-muted hover:text-rose-300"
                aria-label="Borrar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
