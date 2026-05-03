import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useFinanceStore } from '../store'
import { formatCents, startOfMonth, formatLocalDate, computeAccountBalance } from '../utils'
import { messages } from '@core/ui/messages'

/**
 * Widget compacto del Dashboard. Resume balance del mes en la moneda
 * principal (la primera cuenta no archivada).
 */
export function FinanceSummaryWidget() {
  const navigate = useNavigate()
  const accounts = useFinanceStore((s) => s.accounts)
  const transactions = useFinanceStore((s) => s.transactions)

  const summary = useMemo(() => {
    const primary = accounts.find((a) => !a.archived)
    if (!primary) return null
    const monthStart = formatLocalDate(startOfMonth())
    let income = 0
    let expense = 0
    for (const tx of transactions) {
      if (tx.occurredAt < monthStart) continue
      if (tx.kind === 'income') income += tx.amount
      else if (tx.kind === 'expense') expense += tx.amount
    }
    const totalBalance = accounts
      .filter((a) => !a.archived && a.currency === primary.currency)
      .reduce((acc, a) => acc + computeAccountBalance(a, transactions), 0)
    return { currency: primary.currency, income, expense, balance: totalBalance }
  }, [accounts, transactions])

  if (!summary) {
    return (
      <button
        type="button"
        onClick={() => navigate('/finance')}
        className="flex w-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-6 text-sm text-muted hover:text-white"
      >
        {messages.empty.financeAccounts ?? 'Creá una cuenta para arrancar.'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/finance')}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 text-left shadow-xl transition-colors hover:border-accent/50"
    >
      <div className="flex items-center gap-2">
        <Wallet size={16} className="text-accent-light" />
        <span className="text-caption uppercase tracking-eyebrow text-muted">Balance del mes</span>
      </div>
      <div>
        <p className="text-2xl font-semibold text-white">{formatCents(summary.balance, summary.currency)}</p>
        <p className="text-xs text-muted">Total {summary.currency} · {accounts.filter((a) => !a.archived).length} cuentas</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5">
          <ArrowDownRight size={14} className="text-emerald-300" />
          <span className="text-muted">Ingresos</span>
          <span className="ml-auto font-medium text-white">{formatCents(summary.income, summary.currency, { compact: true })}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5">
          <ArrowUpRight size={14} className="text-rose-300" />
          <span className="text-muted">Gastos</span>
          <span className="ml-auto font-medium text-white">{formatCents(summary.expense, summary.currency, { compact: true })}</span>
        </div>
      </div>
    </button>
  )
}
