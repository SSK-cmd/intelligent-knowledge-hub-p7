import type { ReactNode } from 'react'

type SectionProps = {
  id: string
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
}

export function Section({ id, eyebrow, title, description, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 py-10">
      <div className="mb-6 flex flex-col gap-1">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">{eyebrow}</p>
        <h2 id={`${id}-title`} className="font-serif text-3xl font-semibold text-balance">
          {title}
        </h2>
        {description && <p className="max-w-2xl text-muted-foreground text-pretty">{description}</p>}
      </div>
      {children}
    </section>
  )
}
