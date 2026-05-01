import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useFinanceStore } from '../store'
import { createTransaction } from '../operations'
import { detectAnomaly } from '../insights'
import { parseAmountToCents, todayISO, formatCents } from '../utils'
import { useToast } from '@core/ui/components/ToastProvider'
import { messages } from '@core/ui/messages'

/**
 * Captura inline rápida de gasto o ingreso. Target: <5s del foco al Enter.
 *  - Tab/Shift+Tab navega monto → categoría → cuenta.
 *  - Enter en cualquiera de los tres campos confirma.
 *  - El último categoría/cuenta usados se guardan en localStorage para
 *    autocomplete por defecto.
 */
const LAST_USED_KEY = 'finance:lastUsed'

interface LastUsed {
  categoryId?: string
  accountId?: string
  kind?: 'income' | 'expense'
}

function readLastUsed(): LastUsed {
  try {
    const raw = window.localStorage.getItem(LAST_USED_KEY)
    return raw ? (JSON.parse(raw) as LastUsed) : {}
  } catch {
    return {}
  }
}

function writeLastUsed(last: LastUsed): void {
  try {
    window.localStorage.setItem(LAST_USED_KEY, JSON.stringify(last))
  } catch {
    // ignore
  }
}

export function QuickAddTransaction() {
  const allAccounts = useFinanceStore((s) => s.accounts)
  const allCategories = useFinanceStore((s) => s.categories)
  const accounts = useMemo(() => allAccounts.filter((a) => !a.archived), [allAccounts])
  const categories = useMemo(() => allCategories.filter((c) => !c.archived), [allCategories])
  const { toast } = useToast()
  const initial = readLastUsed()

  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<'income' | 'expense'>(initial.kind ?? 'expense')
  const [categoryId, setCategoryId] = useState<string>(initial.categoryId ?? '')
  const [accountId, setAccountId] = useState<string>(initial.accountId ?? accounts[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind],
  )

  // Sincroniza la cuenta seleccionada cuando se crean/archivan cuentas o el id
  // guardado en localStorage ya no existe.
  useEffect(() => {
    if (accounts.length === 0) {
      if (accountId !== '') setAccountId('')
      return
    }
    const exists = accounts.some((a) => a.id === accountId)
    if (!exists) setAccountId(accounts[0].id)
  }, [accounts, accountId])

  // Si la categoría guardada no pertenece al kind actual o fue eliminada, la
  // limpiamos para evitar enviar un id inválido.
  useEffect(() => {
    if (!categoryId) return
    const valid = filteredCategories.some((c) => c.id === categoryId)
    if (!valid) setCategoryId('')
  }, [filteredCategories, categoryId])

  const reset = () => {
    setAmount('')
    setNote('')
    setTimeout(() => amountRef.current?.focus(), 0)
  }

  const submit = async () => {
    const cents = parseAmountToCents(amount)
    if (cents <= 0) {
      toast.error(messages.errors.financeAmountInvalid ?? 'Monto inválido. Usá un número mayor a 0.')
      return
    }
    if (!accountId) {
      toast.error(messages.errors.financeAccountMissing ?? 'Elegí una cuenta.')
      return
    }
    setBusy(true)
    try {
      const tx = await createTransaction({
        accountId,
        categoryId: categoryId || null,
        kind,
        amount: cents,
        occurredAt: todayISO(),
        note: note.trim() || null,
      })
      writeLastUsed({ categoryId: categoryId || undefined, accountId, kind })
      // Anomaly check (silencioso, no bloqueante).
      const anomaly = detectAnomaly(tx.id)
      if (anomaly) {
        toast.info(
          `Gasto inusual en ${anomaly.categoryName}: ${formatCents(anomaly.amountCents)} (≈${Math.round(anomaly.ratio * 10) / 10}× el habitual).`,
          { timeoutMs: 6000 },
        )
      } else {
        toast.success(messages.success.financeTransactionCreated ?? 'Movimiento registrado.', { timeoutMs: 1800 })
      }
      reset()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !busy) {
      e.preventDefault()
      void submit()
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-6 text-sm text-muted">
        {messages.empty.financeAccounts ?? 'Creá una cuenta para arrancar.'}
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-surface-light/90 p-3 shadow-xl md:grid-cols-[auto_1fr_1fr_1fr_2fr_auto]"
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1 text-xs">
        <button
          type="button"
          onClick={() => setKind('expense')}
          className={`rounded-md px-2 py-1 ${kind === 'expense' ? 'bg-rose-500/20 text-rose-100' : 'text-muted hover:text-white'}`}
        >Gasto</button>
        <button
          type="button"
          onClick={() => setKind('income')}
          className={`rounded-md px-2 py-1 ${kind === 'income' ? 'bg-emerald-500/20 text-emerald-100' : 'text-muted hover:text-white'}`}
        >Ingreso</button>
      </div>
      <input
        ref={amountRef}
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Monto"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
        autoFocus
      />
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white outline-none focus:border-accent"
      >
        <option value="">Sin categoría</option>
        {filteredCategories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white outline-none focus:border-accent"
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional)"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="inline-flex items-center justify-center gap-1 rounded-lg border border-accent bg-accent/15 px-3 py-2 text-sm text-accent-light hover:bg-accent/25 disabled:opacity-40"
      >
        <Plus size={14} /> Cargar
      </button>
    </div>
  )
}
