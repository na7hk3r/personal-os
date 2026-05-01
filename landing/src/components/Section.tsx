import type { ReactNode } from 'react'

interface SectionProps {
  id?: string
  title?: string
  eyebrow?: string
  description?: string
  children: ReactNode
  className?: string
  /** Centra el header. Default true. */
  centered?: boolean
}

export function Section({
  id,
  title,
  eyebrow,
  description,
  children,
  className = '',
  centered = true,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`py-20 md:py-28 px-4 md:px-8 max-w-6xl mx-auto ${className}`}
    >
      {(title || eyebrow || description) && (
        <header className={`mb-12 md:mb-16 ${centered ? 'text-center' : ''}`}>
          {eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-3">
              {eyebrow}
            </p>
          )}
          {title && (
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
          )}
          {description && (
            <p
              className={`mt-5 text-lg text-muted leading-relaxed ${
                centered ? 'max-w-2xl mx-auto' : 'max-w-2xl'
              }`}
            >
              {description}
            </p>
          )}
        </header>
      )}
      {children}
    </section>
  )
}
