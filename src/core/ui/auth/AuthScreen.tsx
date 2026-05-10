import { type FormEvent, type Ref, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Eye, EyeOff, UserRound, X } from 'lucide-react'
import { useAuthStore } from '@core/state/authStore'
import { NoraLogoMark } from '@core/ui/components/NoraLogo'

type AuthMode = 'login' | 'register' | 'recovery'

export const REMEMBERED_LOGIN_USERNAME_KEY = 'auth:rememberedUsername:v1'
export const REMEMBERED_LOGIN_USERNAMES_KEY = 'auth:rememberedUsernames:v2'

const MAX_REMEMBERED_USERNAMES = 5

function normalizeRememberedUsernames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const result: string[] = []

  for (const item of raw) {
    const username = typeof item === 'string' ? item.trim() : ''
    if (!username) continue
    const key = username.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(username)
    if (result.length >= MAX_REMEMBERED_USERNAMES) break
  }

  return result
}

function readRememberedUsernames(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(REMEMBERED_LOGIN_USERNAMES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const remembered = normalizeRememberedUsernames(parsed)
    const legacy = window.localStorage.getItem(REMEMBERED_LOGIN_USERNAME_KEY)?.trim()
    const migrated = legacy ? addRememberedUsername(remembered, legacy) : remembered

    if (legacy || JSON.stringify(parsed) !== JSON.stringify(migrated)) {
      writeRememberedUsernames(migrated)
      window.localStorage.removeItem(REMEMBERED_LOGIN_USERNAME_KEY)
    }

    return migrated
  } catch {
    return []
  }
}

function writeRememberedUsernames(usernames: string[]): void {
  try {
    window.localStorage.setItem(
      REMEMBERED_LOGIN_USERNAMES_KEY,
      JSON.stringify(normalizeRememberedUsernames(usernames)),
    )
  } catch {
    // ignore localStorage failures
  }
}

function addRememberedUsername(usernames: string[], username: string): string[] {
  const clean = username.trim()
  if (!clean) return normalizeRememberedUsernames(usernames)
  return normalizeRememberedUsernames([
    clean,
    ...usernames.filter((item) => item.trim().toLowerCase() !== clean.toLowerCase()),
  ])
}

function removeRememberedUsername(usernames: string[], username: string): string[] {
  const clean = username.trim().toLowerCase()
  return normalizeRememberedUsernames(usernames.filter((item) => item.trim().toLowerCase() !== clean))
}

function forgetAllRememberedUsernames(): void {
  writeRememberedUsernames([])
}

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
  const [showPassword, setShowPassword] = useState(false)
  const [rememberedUsernames, setRememberedUsernames] = useState(readRememberedUsernames)
  const [rememberLogin, setRememberLogin] = useState(() => readRememberedUsernames().length > 0)
  const passwordInputRef = useRef<HTMLInputElement | null>(null)

  const [registerQuestion, setRegisterQuestion] = useState('')
  const [registerAnswer, setRegisterAnswer] = useState('')

  const [recoveryQuestion, setRecoveryQuestion] = useState<string | null>(null)
  const [recoveryAnswer, setRecoveryAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
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
    setShowPassword(false)
    setShowNewPassword(false)
    resetLocalMessages()
  }

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    resetLocalMessages()
    await login(username, password)

    const nextRememberedUsername = username.trim()
    if (rememberLogin && nextRememberedUsername) {
      const next = addRememberedUsername(rememberedUsernames, nextRememberedUsername)
      writeRememberedUsernames(next)
      setRememberedUsernames(next)
    } else {
      const next = removeRememberedUsername(rememberedUsernames, nextRememberedUsername)
      writeRememberedUsernames(next)
      setRememberedUsernames(next)
    }
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

  const useRememberedUsername = (rememberedUsername: string) => {
    setMode('login')
    setUsername(rememberedUsername)
    setPassword('')
    setRememberLogin(true)
    setShowPassword(false)
    window.setTimeout(() => passwordInputRef.current?.focus(), 0)
  }

  const forgetRememberedLogin = (rememberedUsername: string) => {
    const next = removeRememberedUsername(rememberedUsernames, rememberedUsername)
    writeRememberedUsernames(next)
    if (username.trim().toLowerCase() === rememberedUsername.trim().toLowerCase()) setUsername('')
    setRememberedUsernames(next)
    setRememberLogin(next.length > 0)
    setPassword('')
  }

  const forgetAllRememberedLogins = () => {
    forgetAllRememberedUsernames()
    if (rememberedUsernames.some((item) => item.trim().toLowerCase() === username.trim().toLowerCase())) {
      setUsername('')
    }
    setRememberedUsernames([])
    setRememberLogin(false)
    setPassword('')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_#1d0e3d_0%,_#110a24_42%,_#07060d_100%)] px-4 text-white">
      {/* Decoración de marca: aura cosmic purple coherente con identidad oficial. */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-[480px] w-[480px] rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-accent-light/10 blur-3xl" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-surface-light/80 p-6 shadow-2xl backdrop-blur">
        <div className="mb-5 flex flex-col items-center text-center">
          {/* Logo oficial Nora OS — ver identidadVisual-noraOS/. */}
          <NoraLogoMark size={64} glow className="mb-3 text-foreground/80" />
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted">Tu sistema. Tu vida. Una sola IA.</p>
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
            {rememberedUsernames.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border bg-surface px-2 py-2">
                <div className="flex items-center justify-between gap-3 px-2">
                  <p className="text-caption font-medium uppercase tracking-wide text-muted">Usuarios recordados</p>
                  {rememberedUsernames.length > 1 && (
                    <button
                      type="button"
                      onClick={forgetAllRememberedLogins}
                      className="text-caption text-muted underline-offset-2 hover:text-white hover:underline"
                    >
                      Olvidar todos
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {rememberedUsernames.map((rememberedUsername) => (
                    <div key={rememberedUsername} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => useRememberedUsername(rememberedUsername)}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-white transition-colors hover:bg-surface-lighter"
                        aria-label={`Usar usuario ${rememberedUsername}`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface-light text-muted">
                          <UserRound size={14} aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{rememberedUsername}</span>
                          <span className="block text-caption text-muted">Usuario recordado</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => forgetRememberedLogin(rememberedUsername)}
                        className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-lighter hover:text-white"
                        aria-label={`Olvidar usuario ${rememberedUsername}`}
                        title="Olvidar usuario"
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              autoComplete="username"
              required
            />
            <PasswordField
              value={password}
              onChange={setPassword}
              placeholder="Contraseña"
              autoComplete="current-password"
              visible={showPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
              inputRef={passwordInputRef}
            />
            <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={rememberLogin}
                onChange={(event) => setRememberLogin(event.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span>Recordar usuario en este equipo</span>
            </label>
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
            <PasswordField
              value={password}
              onChange={setPassword}
              placeholder="Contraseña (mín 8 caracteres)"
              autoComplete="new-password"
              visible={showPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
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
                <PasswordField
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Nueva contraseña (mín 8 caracteres)"
                  autoComplete="new-password"
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((visible) => !visible)}
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

function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
  visible,
  onToggle,
  inputRef,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoComplete: string
  visible: boolean
  onToggle: () => void
  inputRef?: Ref<HTMLInputElement>
}) {
  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={visible ? 'text' : 'password'}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-10 text-sm outline-none focus:border-accent"
        autoComplete={autoComplete}
        required
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
        title={visible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted transition-colors hover:text-white focus:outline-none focus:ring-1 focus:ring-accent/40"
      >
        {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
      </button>
    </div>
  )
}
