import { FormEvent, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@core/state/authStore'
import { BrandIcon } from '@core/ui/components/BrandIcon'

type AuthMode = 'login' | 'register' | 'recovery'

export function AuthScreen() {
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const getRecoveryQuestion = useAuthStore((s) => s.getRecoveryQuestion)
  const resetPasswordWithRecovery = useAuthStore((s) => s.resetPasswordWithRecovery)
  const clearError = useAuthStore((s) => s.clearError)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)

  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [registerQuestion, setRegisterQuestion] = useState('')
  const [registerAnswer, setRegisterAnswer] = useState('')

  const [recoveryQuestion, setRecoveryQuestion] = useState<string | null>(null)
  const [recoveryAnswer, setRecoveryAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)

  const title = useMemo(() => {
    if (mode === 'register') return 'Crear cuenta'
    if (mode === 'recovery') return 'Recuperar acceso'
    return 'Iniciar sesion'
  }, [mode])

  const resetLocalMessages = () => {
    clearError()
    setRecoveryMessage(null)
  }

  const handleChangeMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setRecoveryQuestion(null)
    setRecoveryAnswer('')
    setNewPassword('')
    resetLocalMessages()
  }

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    resetLocalMessages()
    await login(username, password)
  }

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault()
    resetLocalMessages()

    await register({
      username,
      password,
      recoveryQuestion: registerQuestion,
      recoveryAnswer: registerAnswer,
    })
  }

  const handleGetRecoveryQuestion = async (event: FormEvent) => {
    event.preventDefault()
    resetLocalMessages()

    const question = await getRecoveryQuestion(username)
    if (!question) {
      setRecoveryMessage('Usuario no encontrado.')
      return
    }

    setRecoveryQuestion(question)
  }

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault()
    resetLocalMessages()

    await resetPasswordWithRecovery({
      username,
      recoveryAnswer,
      newPassword,
    })

    setRecoveryMessage('✓ Contraseña actualizada. Inicia sesión con tu nueva contraseña.')
    setMode('login')
    setPassword('')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#1a3a52_0%,_#102536_48%,_#0a1420_100%)] px-4 text-white">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-surface-light/80 p-6 shadow-2xl backdrop-blur">
        <div className="mb-5 flex flex-col items-center text-center">
          {/* Logo: CrystalBallEye.svg — marca oficial de Nora OS. */}
          <BrandIcon name="CrystalBallEye" size={64} tile={false} className="mb-3" />
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted">Tu espacio se carga por usuario con sesión local segura.</p>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-surface p-1 text-xs">
          <button
            onClick={() => handleChangeMode('login')}
            className={`rounded-md px-2 py-2 ${mode === 'login' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
          >
            Login
          </button>
          <button
            onClick={() => handleChangeMode('register')}
            className={`rounded-md px-2 py-2 ${mode === 'register' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
          >
            Registro
          </button>
          <button
            onClick={() => handleChangeMode('recovery')}
            className={`rounded-md px-2 py-2 ${mode === 'recovery' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
          >
            Recuperar
          </button>
        </div>

        {mode === 'login' && (
          <form className="space-y-3" onSubmit={handleLogin}>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              autoComplete="username"
              required
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              type="password"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              autoComplete="current-password"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/85 disabled:opacity-70"
            >
              {loading ? 'Ingresando...' : 'Entrar'}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form className="space-y-3" onSubmit={handleRegister}>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              autoComplete="username"
              required
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña (mín 8 caracteres)"
              type="password"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              autoComplete="new-password"
              required
            />
            <input
              value={registerQuestion}
              onChange={(e) => setRegisterQuestion(e.target.value)}
              placeholder="Pregunta de recuperación (mín 10 caracteres)"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              required
            />
            <input
              value={registerAnswer}
              onChange={(e) => setRegisterAnswer(e.target.value)}
              placeholder="Respuesta (será privada y sensible a mayúsculas)"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/85 disabled:opacity-70"
            >
              {loading ? 'Creando...' : 'Crear cuenta'}
            </button>
          </form>
        )}

        {mode === 'recovery' && (
          <div className="space-y-3">
            <form className="space-y-3" onSubmit={handleGetRecoveryQuestion}>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Usuario"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg border border-accent/60 bg-surface px-3 py-2 text-sm font-medium text-accent-light hover:bg-surface-lighter disabled:opacity-70"
              >
                {loading ? 'Buscando...' : 'Ver pregunta secreta'}
              </button>
            </form>

            {recoveryQuestion && (
              <form className="space-y-3" onSubmit={handleResetPassword}>
                <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
                  {recoveryQuestion}
                </div>
                <input
                  value={recoveryAnswer}
                  onChange={(e) => setRecoveryAnswer(e.target.value)}
                  placeholder="Respuesta"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                  required
                />
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  placeholder="Nueva contraseña (mín 8 caracteres)"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/85 disabled:opacity-70"
                >
                  {loading ? 'Actualizando...' : 'Actualizar contrasena'}
                </button>
              </form>
            )}
          </div>
        )}

        {(error || recoveryMessage) && (
          <div className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-3 text-sm ${
            error
              ? 'border border-red-500/30 bg-red-500/10'
              : 'border border-emerald-500/30 bg-emerald-500/10'
          }`}>
            {error ? (
              <>
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                <p className="text-red-200">{error}</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                <p className="text-emerald-200">{recoveryMessage}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
