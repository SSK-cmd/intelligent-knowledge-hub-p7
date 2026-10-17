'use client'

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { Analysis } from '@/lib/analysis-schema'
import { Section } from './section'

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

type Stat = Analysis['statistics'][number]

function StatChart({ stat }: { stat: Stat }) {
  const config: ChartConfig = { value: { label: stat.unit || 'Value', color: 'var(--chart-1)' } }
  const data = stat.data.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }))

  if (stat.chartType === 'pie') {
    return (
      <ChartContainer config={config} className="aspect-square max-h-64 w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} strokeWidth={2} stroke="var(--card)">
            {data.map((d) => (
              <Cell key={d.label} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    )
  }

  if (stat.chartType === 'line') {
    return (
      <ChartContainer config={config} className="h-64 w-full">
        <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} width={40} fontSize={11} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line dataKey="value" stroke="var(--color-value)" strokeWidth={2.5} dot={{ r: 4 }} />
        </LineChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={40} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" radius={6}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

export function StatsSection({ analysis }: { analysis: Analysis }) {
  return (
    <Section
      id="stats"
      eyebrow="06 · Statistics"
      title="The numbers at a glance"
      description="Charts generated from figures in the material, or from topic emphasis when no figures are present."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {analysis.statistics.map((stat, i) => (
          <figure key={i} className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
            <figcaption className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{stat.title}</span>
              <span className="font-mono text-xs text-muted-foreground">{stat.unit}</span>
            </figcaption>
            <StatChart stat={stat} />
            {stat.chartType === 'pie' && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {stat.data.map((d, j) => (
                  <li key={d.label} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm" style={{ background: COLORS[j % COLORS.length] }} />
                    {d.label}
                  </li>
                ))}
              </ul>
            )}
          </figure>
        ))}
      </div>
    </Section>
  )
}
