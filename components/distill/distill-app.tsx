'use client'

import useSWRMutation from 'swr/mutation'
import { ArrowLeft, Brain, Network, Tags, BarChart3, Layers, ListChecks, FileText } from 'lucide-react'
import type { Analysis } from '@/lib/analysis-schema'
import { Uploader } from './uploader'
import { SummarySection } from './summary-section'
import { KeywordsSection } from './keywords-section'
import { FlowSection } from './flow-section'
import { WatchwordsSection } from './watchwords-section'
import { StatsSection } from './stats-section'
import { QuizSection } from './quiz-section'

type AnalyzeArg = { files: File[]; text: string }

async function analyze(url: string, { arg }: { arg: AnalyzeArg }): Promise<Analysis> {
  const body = new FormData()
  arg.files.forEach((f) => body.append('files', f))
  body.append('text', arg.text)
  const res = await fetch(url, { method: 'POST', body })
  const json = await res.json().catch(() => ({ error: 'Unexpected server response.' }))
  if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')
  return json
}

const NAV = [
  { href: '#summary', label: 'Summary' },
  { href: '#insights', label: 'Insights' },
  { href: '#keywords', label: 'Keywords' },
  { href: '#flow', label: 'Flow' },
  { href: '#watchwords', label: 'Watchwords' },
  { href: '#stats', label: 'Stats' },
  { href: '#quiz', label: 'Quiz' },
]

const FEATURES = [
  { icon: FileText, label: 'Summary & insights' },
  { icon: Tags, label: 'Keywords & acronyms' },
  { icon: Network, label: 'Concept flow chart' },
  { icon: Layers, label: 'Emoji watchword cards' },
  { icon: BarChart3, label: 'Statistics charts' },
  { icon: ListChecks, label: 'Flip-card quiz' },
]

export function DistillApp() {
  const { trigger, data, error, isMutating, reset } = useSWRMutation('/api/analyze', analyze)

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <a href="#top" className="flex items-center gap-2 font-serif text-xl font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Brain className="size-4" aria-hidden="true" />
            </span>
            Distill
          </a>
          {data && (
            <>
              <nav aria-label="Sections" className="hidden flex-1 justify-center md:flex">
                <ul className="flex gap-1">
                  {NAV.map((n) => (
                    <li key={n.href}>
                      <a
                        href={n.href}
                        className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {n.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <button
                type="button"
                onClick={() => reset()}
                className="ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-muted md:ml-0"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                New document
              </button>
            </>
          )}
        </div>
      </header>

      <main id="top" className="mx-auto max-w-6xl px-4 pb-24">
        {!data ? (
          <div className="grid gap-10 py-12 lg:grid-cols-2 lg:items-center lg:py-20">
            <div className="flex flex-col gap-6">
              <p className="font-mono text-xs uppercase tracking-widest text-primary">Document → Knowledge</p>
              <h1 className="font-serif text-5xl font-semibold leading-[1.05] text-balance md:text-6xl">
                Read less. <span className="text-primary">Understand</span> more.
              </h1>
              <p className="max-w-md text-lg text-muted-foreground text-pretty">
                Upload any document and Distill turns it into a complete study pack — so you can see the ideas, how
                they connect, and test yourself on them.
              </p>
              <ul className="grid grid-cols-2 gap-3">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-sm">
                    <Icon className="size-4 shrink-0 text-chart-2" aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <Uploader isAnalyzing={isMutating} onAnalyze={(files, text) => trigger({ files, text })} />
              {error && (
                <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {error.message}
                </p>
              )}
              {isMutating && (
                <p className="text-center text-sm text-muted-foreground" aria-live="polite">
                  This can take up to a minute for long documents.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y">
            <SummarySection analysis={data} />
            <KeywordsSection analysis={data} />
            <FlowSection analysis={data} />
            <WatchwordsSection analysis={data} />
            <StatsSection analysis={data} />
            <QuizSection key={data.title} analysis={data} />
          </div>
        )}
      </main>
    </div>
  )
}
