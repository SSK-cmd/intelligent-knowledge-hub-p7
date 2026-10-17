import { Lightbulb, BookOpen } from 'lucide-react'
import type { Analysis } from '@/lib/analysis-schema'
import { Section } from './section'

export function SummarySection({ analysis }: { analysis: Analysis }) {
  return (
    <>
      <Section id="summary" eyebrow="01 · Summary" title={analysis.title}>
        <div className="flex max-w-3xl flex-col gap-4 text-lg leading-relaxed">
          {analysis.summary.split(/\n\n+/).map((p, i) => (
            <p key={i} className="text-pretty">
              {p}
            </p>
          ))}
        </div>
      </Section>

      <Section id="insights" eyebrow="02 · Insight & Knowledge" title="What the material really says">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 font-medium">
              <Lightbulb className="size-4 text-primary" aria-hidden="true" />
              Insights
            </h3>
            <ol className="flex flex-col gap-3">
              {analysis.insights.map((insight, i) => (
                <li key={i} className="flex gap-4 rounded-xl border bg-card p-4">
                  <span className="font-serif text-2xl font-semibold text-primary/70">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="font-medium">{insight.headline}</p>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{insight.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 font-medium">
              <BookOpen className="size-4 text-chart-2" aria-hidden="true" />
              Knowledge
            </h3>
            <dl className="flex flex-col divide-y rounded-xl border bg-card">
              {analysis.knowledge.map((k, i) => (
                <div key={i} className="p-4">
                  <dt className="font-medium">{k.concept}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground leading-relaxed">{k.explanation}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>
    </>
  )
}
