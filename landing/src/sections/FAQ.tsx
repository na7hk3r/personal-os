import { Section } from '../components/Section'
import { faq } from '../data/faq'

export function FAQ() {
  return (
    <Section
      id="faq"
      eyebrow="Preguntas frecuentes"
      title="Resolvemos las dudas más comunes"
    >
      <div className="space-y-3 max-w-3xl mx-auto">
        {faq.map((item) => (
          <details
            key={item.question}
            className="group rounded-xl bg-surface/60 border border-border overflow-hidden hover:border-accent/40 transition-colors"
          >
            <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 font-medium text-foreground">
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="text-accent transition-transform group-open:rotate-45 text-xl leading-none"
              >
                +
              </span>
            </summary>
            <div className="px-5 pb-5 text-sm text-muted leading-relaxed">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </Section>
  )
}
