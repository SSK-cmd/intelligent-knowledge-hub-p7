'use client'

import { useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import type { Analysis } from '@/lib/analysis-schema'
import { cn } from '@/lib/utils'
import { Section } from './section'

type Question = Analysis['quiz'][number]

const normalize = (s: string) => s.trim().toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ')

function isCorrect(q: Question, answer: string) {
  const given = normalize(answer)
  if (!given) return false
  if (q.type !== 'short_answer') return given === normalize(q.answer)
  const accepted = [q.answer, ...q.acceptedAnswers].map(normalize)
  return accepted.some((a) => a === given || (a.length > 3 && given.includes(a)))
}

function QuizCard({
  q,
  index,
  answer,
  submitted,
  onAnswer,
}: {
  q: Question
  index: number
  answer: string
  submitted: boolean
  onAnswer: (value: string) => void
}) {
  const correct = submitted && isCorrect(q, answer)
  const choices = q.type === 'true_false' && q.options.length === 0 ? ['True', 'False'] : q.options

  return (
    <li className="perspective-1000 min-h-80">
      <div
        className={cn(
          'preserve-3d relative grid h-full transition-transform duration-700',
          submitted && 'rotate-y-180',
        )}
      >
        <fieldset
          disabled={submitted}
          aria-hidden={submitted}
          className="backface-hidden col-start-1 row-start-1 flex flex-col gap-4 rounded-2xl border bg-card p-5"
        >
          <legend className="sr-only">Question {index + 1}</legend>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">Q{String(index + 1).padStart(2, '0')}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {q.type.replace('_', ' ')}
            </span>
          </div>
          <p className="font-medium leading-snug text-pretty">{q.question}</p>
          {q.type === 'short_answer' ? (
            <Input
              value={answer}
              onChange={(e) => onAnswer(e.target.value)}
              placeholder="Type your answer"
              aria-label={`Answer for question ${index + 1}`}
              className="mt-auto"
            />
          ) : (
            <div className="mt-auto flex flex-col gap-2">
              {choices.map((opt) => (
                <label
                  key={opt}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                    answer === opt ? 'border-primary bg-primary/10' : 'hover:bg-muted',
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${index}`}
                    value={opt}
                    checked={answer === opt}
                    onChange={() => onAnswer(opt)}
                    className="accent-primary"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div
          aria-hidden={!submitted}
          className={cn(
            'backface-hidden rotate-y-180 col-start-1 row-start-1 flex flex-col gap-3 rounded-2xl border-2 p-5',
            correct ? 'border-success bg-success/10' : 'border-destructive/60 bg-destructive/5',
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-8 items-center justify-center rounded-full text-white',
                correct ? 'bg-success' : 'bg-destructive',
              )}
            >
              {correct ? <Check className="size-4" /> : <X className="size-4" />}
            </span>
            <span className="font-semibold">{correct ? 'Correct!' : 'Not quite'}</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">Q{String(index + 1).padStart(2, '0')}</span>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Your answer</p>
            <p className="font-medium">{answer || '—'}</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Correct answer</p>
            <p className="font-serif text-lg font-semibold">{q.answer}</p>
          </div>
          <p className="mt-auto text-sm leading-relaxed text-muted-foreground">{q.explanation}</p>
        </div>
      </div>
    </li>
  )
}

export function QuizSection({ analysis }: { analysis: Analysis }) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const total = analysis.quiz.length
  const answered = Object.values(answers).filter((a) => a.trim()).length
  const score = analysis.quiz.filter((q, i) => isCorrect(q, answers[i] ?? '')).length

  return (
    <Section
      id="quiz"
      eyebrow="07 · Quiz"
      title="Test what you learned"
      description="Answer every card, then submit — each card flips to reveal the answer and explanation."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitted(true)
        }}
        className="flex flex-col gap-6"
      >
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-4 rounded-xl border bg-background/90 p-3 backdrop-blur">
          <div className="flex min-w-48 flex-1 items-center gap-3">
            <Progress value={(answered / total) * 100} className="flex-1" aria-label="Quiz progress" />
            <span className="font-mono text-sm text-muted-foreground">
              {answered}/{total}
            </span>
          </div>
          {submitted ? (
            <>
              <p className="font-medium" role="status">
                Score: <span className="font-serif text-xl text-primary">{score}</span> / {total}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAnswers({})
                  setSubmitted(false)
                }}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Retry
              </Button>
            </>
          ) : (
            <Button type="submit" disabled={answered === 0}>
              Submit answers
            </Button>
          )}
        </div>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {analysis.quiz.map((q, i) => (
            <QuizCard
              key={i}
              q={q}
              index={i}
              answer={answers[i] ?? ''}
              submitted={submitted}
              onAnswer={(value) => setAnswers((prev) => ({ ...prev, [i]: value }))}
            />
          ))}
        </ol>
      </form>
    </Section>
  )
}
