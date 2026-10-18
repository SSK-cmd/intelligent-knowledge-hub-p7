import type { AnalysisModelInfo } from '@/lib/analysis-model'

export function ModelStatus({ model, paymentRequiredModel }: AnalysisModelInfo) {
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <p className="font-medium">{model.name} · Free-credit analysis</p>
      <p className="mt-1 text-muted-foreground">
        Uses available free AI credits, subject to usage limits.
      </p>
      <p className="mt-2 text-muted-foreground">
        {paymentRequiredModel.name} · <span className="font-medium">Payment required</span>
        {' — '}not run.
      </p>
    </div>
  )
}
