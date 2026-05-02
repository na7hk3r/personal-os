import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Receipt, Repeat, Tag, BarChart3, Sparkles } from 'lucide-react'
import { BrandIcon } from '@core/ui/components/BrandIcon'
import { useFinanceStore } from '../store'
import { QuickAddTransaction } from '../components/QuickAddTransaction'
import { AccountsManager } from '../components/AccountsManager'
import { formatCents, startOfMonth, formatLocalDate, computeAccountBalance, previousMonth } from '../utils'
import { messages } from '@core/ui/messages'

export function FinanceDashboard() {
  const navigate = useNavigate()
  const allAccounts = useFinanceStore((s) => s.accounts)
  const transactions = useFinanceStore((s) => s.transactions)
  const budgets = useFinanceStore((s) => s.budgets)
  const categories = useFinanceStore((s) => s.categories)
  const accounts = useMemo(() => allAccounts.filter((a) => !a.archived), [allAccounts])

  const stats = useMemo(() => {
    const monthStart = formatLocalDate(startOfMonth())
    const prev = previousMonth()
    const prevStart = formatLocalDate(prev.start)
    const prevEnd = formatLocalDate(prev.end)
    let income = 0
    let expense = 0
    let prevExpense = 0
    for (const tx of transactions) {
      if (tx.kind === 'income' && tx.occurredAt >= monthStart) income += tx.amount
      else if (tx.kind === 'expense' && tx.occurredAt >= monthStart) expense += tx.amount
      else if (tx.kind === 'expense' && tx.occurredAt >= prevStart && tx.occurredAt <= prevEnd) {
        prevExpense += tx.amount
      }
    }
    const currency = accounts[0]?.currency ?? 'UYU'
    const totalBalance = accounts
      .filter((a) => a.currency === currency)
      .reduce((acc, a) => acc + computeAccountBalance(a, transactions), 0)
    const deltaPct = prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 100) : null
    return { income, expense, currency, totalBalance, deltaPct }
  }, [accounts, transactions])

  const monthTxs = useMemo(() => {
    const monthStart = formatLocalDate(startOfMonth())
    return transactions
      .filter((t) => t.occurredAt >= monthStart && t.kind !== 'transfer')
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0))
      .slice(0, 30)
  }, [transactions])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof monthTxs>()
    for (const tx of monthTxs) {
      const arr = map.get(tx.occurredAt) ?? []
      arr.push(tx)
      map.set(tx.occurredAt, arr)
    }
    return Array.from(map.entries())
  }, [monthTxs])

  const budgetByCat = useMemo(() => new Map(budgets.map((b) => [b.categoryId, b])), [budgets])
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <BrandIcon name="TreasureChest" size={44} />
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Finanzas</p>
            <h1 className="text-2xl font-semibold text-white">{formatCents(stats.totalBalance, stats.currency)}</h1>
            <p className="text-xs text-muted">
              Balance total · {accounts.length} {accounts.length === 1 ? 'cuenta' : 'cuentas'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <NavChip icon={<Receipt size={12} />} label="Movimientos" onClick={() => navigate('/finance/transactions')} />
          <NavChip icon={<Tag size={12} />} label="Categorías" onClick={() => navigate('/finance/categories')} />
          <NavChip icon={<Repeat size={12} />} label="Recurrentes" onClick={() => navigate('/finance/recurring')} />
          <NavChip icon={<BarChart3 size={12} />} label="Presupuestos" onClick={() => navigate('/finance/budgets')} />
          <NavChip icon={<Sparkles size={12} />} label="Insights" onClick={() => navigate('/finance/insights')} />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Kpi label="Ingresos del mes" value={formatCents(stats.income, stats.currency, { compact: true })} accent="text-emerald-300" icon={<ArrowDownRight size={14} />} />
        <Kpi label="Gastos del mes" value={formatCents(stats.expense, stats.currency, { compact: true })} accent="text-rose-300" icon={<ArrowUpRight size={14} />} hint={stats.deltaPct != null ? `${stats.deltaPct > 0 ? '+' : ''}${stats.deltaPct}% vs mes anterior` : undefined} />
        <Kpi label="Saldo neto del mes" value={formatCents(stats.income - stats.expense, stats.currency, { compact: true })} accent={stats.income - stats.expense >= 0 ? 'text-emerald-300' : 'text-rose-300'} icon={<BarChart3 size={14} />} />
      </section>

      <QuickAddTransaction />

      <AccountsManager />

      <section className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Movimientos del mes</h2>
          <button
            type="button"
            onClick={() => navigate('/finance/transactions')}
            className="text-xs text-muted hover:text-white"
          >Ver todo →</button>
        </header>
        {grouped.length === 0 && (
          <p className="text-sm text-muted">{messages.empty.financeTransactions}</p>
        )}
        <div className="divide-y divide-border/40">
          {grouped.map(([date, txs]) => (
            <div key={date} className="py-2">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">{formatHumanDate(date)}</p>
              <ul className="space-y-1">
                {txs.map((tx) => {
                  const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null
                  const acc = accountById.get(tx.accountId)
                  const budget = cat ? budgetByCat.get(cat.id) : null
                  return (
                    <li key={tx.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-surface/60">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`flex-shrink-0 ${tx.kind === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {tx.kind === 'income' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                        </span>
                        <span className="truncate text-white">{cat?.name ?? 'Sin categoría'}</span>
                        {tx.note && <span className="truncate text-xs text-muted">· {tx.note}</span>}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2 text-xs text-muted">
                        {budget && <span title="Presupuesto definido" className="text-amber-300/70">●</span>}
                        <span>{acc?.name}</span>
                        <span className={`font-mono font-medium ${tx.kind === 'income' ? 'text-emerald-200' : 'text-rose-200'}`}>
                          {tx.kind === 'income' ? '+' : '−'}{formatCents(tx.amount, tx.currency)}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Kpi({ label, value, accent, icon, hint }: { label: string; value: string; accent: string; icon: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className={`mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider ${accent}`}>
        {icon}<span>{label}</span>
      </div>
      <p className="text-xl font-semibold text-white">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

function NavChip({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-muted transition-colors hover:text-white"
    >
      {icon}<span>{label}</span>
    </button>
  )
}

function formatHumanDate(iso: string): string {
  const today = formatLocalDate(new Date())
  const yest = formatLocalDate(new Date(Date.now() - 86_400_000))
  if (iso === today) return 'Hoy'
  if (iso === yest) return 'Ayer'
  try {
    return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`))
  } catch {
    return iso
  }
}
