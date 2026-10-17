import type { Analysis } from '@/lib/analysis-schema'
import { cn } from '@/lib/utils'
import { Section } from './section'

function sizeFor(importance: number) {
  if (importance >= 9) return 'text-2xl px-4 py-2 bg-primary text-primary-foreground border-primary'
  if (importance >= 7) return 'text-lg px-3.5 py-1.5 bg-primary/10 text-primary border-primary/30'
  if (importance >= 5) return 'text-base px-3 py-1 bg-accent text-accent-foreground border-transparent'
  return 'text-sm px-2.5 py-1 bg-card text-muted-foreground'
}

export function KeywordsSection({ analysis }: { analysis: Analysis }) {
  const keywords = [...analysis.keywords].sort((a, b) => b.importance - a.importance)

  return (
    <Section
      id="keywords"
      eyebrow="03 · Keywords & Acronyms"
      title="The vocabulary of the material"
      description="Larger terms carry more weight in the material."
    >
      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <ul className="flex flex-wrap content-start items-center gap-2" aria-label="Keywords by importance">
          {keywords.map((k) => (
            <li
              key={k.term}
              className={cn('rounded-full border font-medium', sizeFor(k.importance))}
              title={`Importance ${k.importance}/10`}
            >
              {k.term}
            </li>
          ))}
        </ul>

        <dl className="flex flex-col gap-3">
          {analysis.acronyms.map((a) => (
            <div key={a.acronym} className="rounded-xl border bg-card p-4">
              <dt className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-xl font-bold tracking-wider text-primary">{a.acronym}</span>
                <span className="font-medium">{a.expansion}</span>
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground leading-relaxed">{a.meaning}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  )
}
