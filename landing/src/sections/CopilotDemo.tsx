import { useEffect, useMemo, useState } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import { Section } from '../components/Section'
import { useTypewriter } from '../hooks/useTypewriter'

interface Reply {
  /** Texto que tipea el copiloto */
  body: string
  /** Líneas estructuradas debajo del cuerpo */
  bullets?: { icon: string; text: string }[]
  /** Cierre con CTA dentro del mensaje */
  closing?: string
}

interface QuickAction {
  label: string
  reply: Reply
}

const INITIAL_REPLY: Reply = {
  body: 'Buenos días, Nico. Hoy estás al 71% de tu score semanal.',
  bullets: [
    { icon: '⚡', text: 'Foco: 2h 40m esta semana (objetivo: 4h)' },
    { icon: '💪', text: 'Ejercicio: 4 días consecutivos — racha activa' },
    { icon: '💰', text: 'Finanzas: 12% por encima del presupuesto' },
  ],
  closing:
    'Para volver a baseline hoy:\n→ Completar "Propuesta cliente X" (vence hoy)\n→ 45 min de foco antes de las 14hs',
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: '¿En qué enfocarme?',
    reply: {
      body:
        'Hoy lo más urgente es cerrar la propuesta del cliente X. Vence en 6 horas y bloquea tu KR de Q2.',
      bullets: [
        { icon: '🎯', text: '1 tarea crítica · 2 importantes · 5 menores' },
        { icon: '⏱️', text: 'Bloque sugerido: 90 min de foco profundo' },
      ],
      closing: 'Arrancá con la propuesta. Las menores las hacemos después de las 17hs.',
    },
  },
  {
    label: 'Organizame el día',
    reply: {
      body: 'Plan armado en base a tu energía habitual y vencimientos:',
      bullets: [
        { icon: '🌅', text: '09:00 — 10:30 · Foco profundo · Propuesta cliente X' },
        { icon: '☕', text: '10:30 — 11:00 · Break + email triage' },
        { icon: '🧠', text: '11:00 — 12:30 · Code review + arquitectura' },
        { icon: '🍽️', text: '13:00 — 14:00 · Almuerzo' },
        { icon: '💪', text: '18:00 — 19:00 · Entrenamiento (día 5 de racha)' },
      ],
    },
  },
  {
    label: '¿Qué estoy descuidando?',
    reply: {
      body: 'Mirando los últimos 14 días, tres áreas en rojo:',
      bullets: [
        { icon: '📚', text: 'Knowledge: sin sesiones de estudio hace 8 días' },
        { icon: '😴', text: 'Sueño: promedio 6h 10m (objetivo: 7h)' },
        { icon: '💸', text: 'Finance: gastos en delivery +34% vs mes pasado' },
      ],
      closing: 'Sugerencia: hoy 30 min de lectura + dormirte 9 antes de medianoche.',
    },
  },
  {
    label: 'Review rápido',
    reply: {
      body: 'Resumen de la semana, sin floja:',
      bullets: [
        { icon: '✅', text: '12 tareas completadas (vs 9 promedio)' },
        { icon: '🔥', text: 'Racha de hábitos: 4/6 mantenidos' },
        { icon: '📈', text: 'Foco semanal: 67% del objetivo' },
        { icon: '⚠️', text: 'Goal Q2 "Lanzar v2": 38% — vas atrasado' },
      ],
      closing: 'Próxima semana: priorizar 2 sesiones de foco diario para recuperar Goal Q2.',
    },
  },
]

function ReplyView({ reply }: { reply: Reply }) {
  // Typewriter sólo del cuerpo principal — los bullets aparecen al terminar
  const { text, done } = useTypewriter(reply.body, {
    speed: 18,
    startDelay: 80,
    whenVisible: false,
  })

  return (
    <div className="space-y-3">
      <p className="text-sm md:text-base text-foreground leading-relaxed font-mono min-h-[1.5em]">
        {text}
        {!done && (
          <span
            aria-hidden="true"
            className="inline-block w-[0.55ch] ml-[1px] bg-accent"
            style={{ height: '1em', verticalAlign: 'middle' }}
          />
        )}
      </p>

      {done && reply.bullets && reply.bullets.length > 0 && (
        <ul className="space-y-1.5 animate-fade-in">
          {reply.bullets.map((b, i) => (
            <li
              key={i}
              className="text-sm text-muted flex items-start gap-2 leading-relaxed"
            >
              <span aria-hidden="true" className="shrink-0">
                {b.icon}
              </span>
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
      )}

      {done && reply.closing && (
        <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed pt-2 border-t border-border/50 animate-fade-in">
          {reply.closing}
        </p>
      )}
    </div>
  )
}

export function CopilotDemo() {
  const [reply, setReply] = useState<Reply>(INITIAL_REPLY)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  // Key que fuerza re-mount del ReplyView cuando cambia la reply
  const replyKey = useMemo(() => `${activeIdx ?? 'init'}-${reply.body.slice(0, 8)}`, [
    reply,
    activeIdx,
  ])

  // Auto-rotación sutil al primer entrar (opcional). La dejamos manual.
  useEffect(() => {
    // noop — la animación inicial ocurre on-mount
  }, [])

  function handleClick(idx: number) {
    setActiveIdx(idx)
    setReply(QUICK_ACTIONS[idx].reply)
  }

  return (
    <Section
      id="copilot-demo"
      eyebrow="Copiloto IA local"
      title="Preguntale a tu propia app"
      description="Tu copiloto conoce tu trabajo, hábitos, salud y finanzas. No es un chatbot genérico: opera sobre tus datos reales."
    >
      <div className="max-w-3xl mx-auto">
        {/* Marco simulando un panel del copiloto */}
        <div className="rounded-2xl border border-border bg-surface/70 backdrop-blur shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-surface-light/50">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent/15 text-accent">
              <Bot className="w-4 h-4" aria-hidden="true" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">
                Nora OS Copiloto
              </p>
              <p className="text-xs text-muted leading-tight flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"
                />
                Local · Ollama detectado
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              Demo
            </span>
          </div>

          {/* Body */}
          <div className="px-5 py-6 min-h-[260px]">
            <ReplyView key={replyKey} reply={reply} />
          </div>

          {/* Quick actions */}
          <div className="px-4 py-3 border-t border-border bg-base/40">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((qa, idx) => {
                const isActive = activeIdx === idx
                return (
                  <button
                    key={qa.label}
                    type="button"
                    onClick={() => handleClick(idx)}
                    className={`text-left text-xs md:text-sm px-3 py-2 rounded-lg border transition-colors ${
                      isActive
                        ? 'bg-accent/15 border-accent/50 text-foreground'
                        : 'bg-surface/60 border-border text-muted hover:text-foreground hover:border-accent/40'
                    }`}
                  >
                    {qa.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <p className="text-center text-xs md:text-sm text-muted mt-6">
          Tus datos reales. Tu modelo local. Sin internet.
        </p>
      </div>
    </Section>
  )
}
