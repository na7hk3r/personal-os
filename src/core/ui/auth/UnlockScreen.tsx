import { useEffect, useState } from 'react'
import { Lock, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '../../state/authStore'
import { messages } from '../messages'
import { BrandIcon } from '../components/BrandIcon'

interface UnlockScreenProps {
  onUnlocked: () => void
}

/**
 * Pantalla intermedia entre login y bootstrap cuando la DB del usuario está
 * cifrada en reposo. Pide la passphrase, llama a `dbencryption:unlock`, y al
 * éxito invoca `onUnlocked` para que App vuelva a chequear y arranque.
 */
export function UnlockScreen({ onUnlocked }: UnlockScreenProps) {
  const logout = useAuthStore((s) => s.logout)
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
  }, [pass])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !pass) return
    setBusy(true)
    setError('')
    try {
      const result = await window.dbEncryption.unlock(pass)
      if (result.ok) {
        onUnlocked()
      } else if (result.code === 'BAD_PASSPHRASE' || result.code === 'CORRUPT_FILE') {
        setError('Passphrase incorrecta. Probá de nuevo.')
      } else {
        setError(result.message ?? 'No se pudo desbloquear la base.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#16324f_0%,_#101923_45%,_#070d14_100%)] text-white">
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-surface-light/80 p-8 shadow-2xl backdrop-blur"
      >
        <div className="mb-4 flex flex-col items-center text-center">
          {/* Logo: CrystalBallEye.svg — marca oficial de Nora OS. */}
          <BrandIcon name="CrystalBallEye" size={64} tile={false} className="mb-3" />
        </div>
        <div className="flex items-center gap-2">
          <Lock size={20} className="text-accent-light" aria-hidden />
          <h1 className="text-lg font-semibold">Desbloquear base cifrada</h1>
        </div>
        <p className="mt-2 text-sm text-muted">
          Tu base local está cifrada. Ingresá la passphrase para abrirla.
        </p>

        <label className="mt-4 block text-xs text-muted">
          Passphrase
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoFocus
            autoComplete="current-password"
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
          />
        </label>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-3 flex items-start gap-2 rounded bg-warning/10 p-2 text-xs text-warning"
          >
            <ShieldAlert size={14} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            disabled={busy || !pass}
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/85 disabled:opacity-60"
          >
            {busy ? 'Desbloqueando…' : 'Desbloquear'}
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={busy}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-white disabled:opacity-60"
          >
            {messages.confirm.logout ? 'Cerrar sesión' : 'Salir'}
          </button>
        </div>

        <p className="mt-4 text-xs text-muted">
          Si perdiste la passphrase, no hay recuperación. Restaurá un backup desde otra cuenta.
        </p>
      </form>
    </div>
  )
}
