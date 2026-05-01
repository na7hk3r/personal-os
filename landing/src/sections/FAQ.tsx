import { Section } from '../components/Section'
import { Accordion, type AccordionItem } from '../components/Accordion'
import { faq } from '../data/faq'

export function FAQ() {
  const items: AccordionItem[] = faq.map((item) => ({
    id: item.question,
    question: item.question,
    answer: item.answer,
  }))

  return (
    <Section
      id="faq"
      eyebrow="Preguntas frecuentes"
      title="Resolvemos las dudas más comunes"
    >
      <div className="max-w-3xl mx-auto">
        <Accordion items={items} />
      </div>
    </Section>
  )
}
