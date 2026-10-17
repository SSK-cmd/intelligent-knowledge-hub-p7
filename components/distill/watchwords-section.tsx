import type { Analysis } from '@/lib/analysis-schema'
import { Section } from './section'

const TINTS = ['bg-primary/10', 'bg-accent', 'bg-chart-3/20', 'bg-chart-5/15', 'bg-chart-4/10']

export function WatchwordsSection({ analysis }: { analysis: Analysis }) {
  return (
    <Section
      id="watchwords"
      eyebrow="05 · Watchwords"
      title="Words to remember"
      description="Memorable cues paired with emojis to anchor each idea."
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {analysis.watchwords.map((w, i) => (
          <li
            key={`${w.word}-${i}`}
            className="flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-transform hover:-translate-y-1"
          >
            <span
              className={`flex size-14 items-center justify-center rounded-xl text-3xl ${TINTS[i % TINTS.length]}`}
              aria-hidden="true"
            >
              {w.emoji}
            </span>
            <p className="font-serif text-xl font-semibold leading-tight">{w.word}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{w.meaning}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}
