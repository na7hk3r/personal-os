import { Section } from '../components/Section'
import { Boxes, ListChecks, Bot } from 'lucide-react'

interface Step {
  number: string
  title: string
  description: string
  icon: typeof Boxes
}

const steps: Step[] = [
  {
    number: '1',
    title: 'Instalá y activá tus módulos',
    description:
      'Elegís qué partes de tu vida querés trackear: trabajo, hábitos, salud, finanzas. Activás, desactivás. Sin compromiso.',
    icon: Boxes,
  },
  {
    number: '2',
    title: 'Usás la app normalmente',
    description:
      'Registrás tareas, entrenamientos, gastos. En 2 minutos al día. Todo se guarda en tu máquina, nunca sale de ella.',
    icon: ListChecks,
  },
  {
    number: '3',
    title: 'El copiloto analiza y te guía',
    description:
      'Cada mañana sabés qué hacer. Si algo va mal, lo detecta. Si tenés Ollama instalado, podés preguntarle cualquier cosa.',
    icon: Bot,
  },
]

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="Cómo funciona"
      title="Tres pasos. Sin configuración compleja."
      description="Sin tutorial de 40 minutos. Sin onboarding eterno. Bajás, instalás y empieza a servirte."
    >
      <div className="relative">
        {/* Línea conectora horizontal en desktop */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-border to-transparent"
        />

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          {steps.map(({ number, title, description, icon: Icon }) => (
            <li
              key={number}
              className="relative flex flex-col items-center text-center px-2"
            >
              <div className="relative mb-6">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-full bg-accent/15 blur-xl"
                />
                <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center relative">
                  <Icon className="w-7 h-7 text-accent" aria-hidden="true" />
                  <span
                    aria-hidden="true"
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center shadow-md"
                  >
                    {number}
                  </span>
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
                {title}
              </h3>
              <p className="text-sm md:text-base text-muted leading-relaxed max-w-xs">
                {description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}
