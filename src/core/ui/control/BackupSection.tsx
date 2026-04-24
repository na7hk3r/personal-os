import { useState } from 'react'
import { Download, Upload, ShieldCheck } from 'lucide-react'

function passphrasePrompt(action: string): string | null {
  const value = window.prompt(`Ingresá tu passphrase para ${action} (mínimo 8 caracteres). Esta clave NO se guarda; sin ella el backup no se puede restaurar.`)
  if (value == null) return null
  if (value.length < 8) {
    window.alert('La passphrase debe tener al menos 8 caracteres')
    return null
  }
  return value
}

export function BackupSection() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>('')

  const run = async (kind: 'export-plain' | 'export-encrypted' | 'import-plain' | 'import-encrypted') => {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      let result: { ok: boolean; path?: string; error?: string }
      if (kind === 'export-plain') result = await window.backup.exportPlain()
      else if (kind === 'export-encrypted') {
        const pass = passphrasePrompt('cifrar el backup')
        if (!pass) { setBusy(false); return }
        result = await window.backup.exportEncrypted(pass)
      } else if (kind === 'import-plain') {
        if (!window.confirm('Restaurar reemplaza tu base de datos actual. ¿Continuar?')) { setBusy(false); return }
        result = await window.backup.importPlain()
      } else {
        const pass = passphrasePrompt('descifrar el backup')
        if (!pass) { setBusy(false); return }
        if (!window.confirm('Restaurar reemplaza tu base de datos actual. ¿Continuar?')) { setBusy(false); return }
        result = await window.backup.importEncrypted(pass)
      }
      if (result?.ok) {
        setMessage(result.path ? `OK · ${result.path}` : 'OK')
        if (kind.startsWith('import')) window.alert('Restauración completa. Reiniciá la app para aplicar los cambios.')
      } else {
        setMessage(result?.error ?? 'Operación cancelada')
      }
    } catch (err) {
      setMessage((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-surface-light/85 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-accent-light" />
        <h2 className="text-lg font-semibold">Backup y restauración</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Exportá toda tu base local como archivo. Recomendado: backup cifrado con passphrase fuerte.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          onClick={() => void run('export-encrypted')}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
        >
          <Download size={13} /> Exportar cifrado (recomendado)
        </button>
        <button
          onClick={() => void run('import-encrypted')}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted hover:text-white disabled:opacity-60"
        >
          <Upload size={13} /> Restaurar cifrado
        </button>
        <button
          onClick={() => void run('export-plain')}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted hover:text-white disabled:opacity-60"
        >
          <Download size={13} /> Exportar sin cifrar (.db)
        </button>
        <button
          onClick={() => void run('import-plain')}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted hover:text-white disabled:opacity-60"
        >
          <Upload size={13} /> Restaurar sin cifrar (.db)
        </button>
      </div>

      {message && <p className="mt-3 text-xs text-muted">{message}</p>}
    </article>
  )
}
