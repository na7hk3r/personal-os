import { useState } from 'react'
import { messages } from '../../messages'

interface Props {
  initialName: string
  onNext: (name: string) => void
}

export function StepName({ initialName, onNext }: Props) {
  const [name, setName] = useState(initialName)

  const submit = () => {
    if (name.trim()) onNext(name.trim())
  }

  return (
    <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-muted">Paso 1 de 4</p>
        <h2 className="text-3xl font-bold">{messages.onboarding.nameHeading}</h2>
        <p className="text-sm text-muted">{messages.onboarding.nameHelp}</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Tu nombre"
          className="w-full rounded-xl border border-border bg-surface/80 px-5 py-3.5 text-lg text-center placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
        />

        <button
          onClick={submit}
          disabled={!name.trim()}
          className="w-full rounded-2xl bg-accent hover:bg-accent/80 disabled:opacity-40 active:scale-95 transition-all px-8 py-3 text-sm font-semibold text-white"
        >
          {messages.actions.continue}
        </button>
      </div>
    </div>
  )
}
