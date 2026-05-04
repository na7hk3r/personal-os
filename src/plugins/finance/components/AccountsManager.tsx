import { useState } from 'react'
import { Plus, Trash2, Wallet } from 'lucide-react'
import { useFinanceStore } from '../store'
import { createAccount, archiveAccount } from '../operations'
import { parseAmountToCents, formatCents, computeAccountBalance } from '../utils'
import { useToast } from '@core/ui/components/ToastProvider'
import type { AccountType } from '../types'

const TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Efectivo',
  bank: 'Banco',
  card: 'Tarjeta',
  wallet: 'Billetera',
}

/**
 * Editor inline de cuentas. Compacto, embebible en cualquier lugar.
 *  - Si no hay cuentas, muestra estado vacío con CTA evidente.
 *  - Si hay, muestra grilla con saldo computado y opción de archivar.
 */
export function AccountsManager() {
  const accounts = useFinanceStore((s) => s.accounts)
  const transactions = useFinanceStore((s) => s.transactions)
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('cash')
  const [currency, setCurrency] = useState('UYU')
  const [initial, setInitial] = useState('')
  const [busy, setBusy] = useState(false)

  const onCreate = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await createAccount({
        name: name.trim(),
        type,
        currency: currency.trim().toUpperCase() || 'UYU',
        initialBalance: parseAmountToCents(initial),
      })
      setName('')
      setInitial('')
      setOpen(false)
      toast.success('Cuenta creada.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onArchive = async (id: string) => {
    try {
      await archiveAccount(id)
      toast.info('Cuenta archivada.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const visible = accounts.filter((a) => !a.archived)

  return (
    <section className="rounded-2xl border border-border bg-surface-light/90 p-4 shadow-xl">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={14} className="text-accent-light" />
          <h2 className="text-sm font-semibold text-white">Cuentas</h2>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-accent bg-accent/15 px-2.5 py-1 text-xs text-accent-light hover:bg-accent/25">
          <Plus size={12} /> Nueva
        </button>
      </header>

      {open && (
        <div className="mb-3 grid grid-cols-1 gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre"
            className="min-w-0 rounded-lg border border-border bg-surface-light px-2 py-1.5 text-sm text-white sm:col-span-2 lg:col-span-1" autoFocus />
          <select value={type} onChange={(e) => setType(e.target.value as AccountType)}
            className="min-w-0 rounded-lg border border-border bg-surface-light px-2 py-1.5 text-sm text-white">
            {(Object.keys(TYPE_LABELS) as AccountType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="UYU"
            className="w-full rounded-lg border border-border bg-surface-light px-2 py-1.5 text-sm text-white lg:w-20" />
          <input value={initial} onChange={(e) => setInitial(e.target.value)} placeholder="Saldo inicial" inputMode="decimal"
            className="w-full rounded-lg border border-border bg-surface-light px-2 py-1.5 text-sm text-white lg:w-32" />
          <button type="button" onClick={() => void onCreate()} disabled={busy || !name.trim()}
            className="rounded-lg border border-accent bg-accent/15 px-3 py-1.5 text-xs text-accent-light hover:bg-accent/25 disabled:opacity-40 sm:col-span-2 lg:col-span-1">
            Crear
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/40 px-3 py-4 text-center text-xs text-muted">
          Sin cuentas. Creá la primera para arrancar.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {visible.map((a) => {
            const balance = computeAccountBalance(a, transactions)
            return (
              <li key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2">
                <div>
                  <p className="text-sm text-white">{a.name}</p>
                  <p className="text-xs text-muted">{TYPE_LABELS[a.type]} · {a.currency}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-sm ${balance >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                    {formatCents(balance, a.currency)}
                  </span>
                  <button type="button" onClick={() => void onArchive(a.id)}
                    className="rounded p-1 text-muted hover:text-rose-300" aria-label="Archivar">
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
