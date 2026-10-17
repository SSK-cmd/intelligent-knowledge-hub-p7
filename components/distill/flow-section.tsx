'use client'

import { useMemo } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Analysis } from '@/lib/analysis-schema'
import { Section } from './section'

const NODE_WIDTH = 170
const H_GAP = 40
const V_GAP = 130

const LEVEL_STYLES = [
  { background: 'var(--primary)', color: 'var(--primary-foreground)', borderColor: 'var(--primary)', fontWeight: 700, fontSize: 15 },
  { background: 'var(--accent)', color: 'var(--accent-foreground)', borderColor: 'var(--chart-2)', fontWeight: 600, fontSize: 13 },
  { background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)', fontWeight: 500, fontSize: 12 },
]

function buildGraph(flow: Analysis['flow']) {
  const ids = new Set(flow.nodes.map((n) => n.id))
  const levels = new Map<number, Analysis['flow']['nodes']>()
  for (const n of flow.nodes) {
    const list = levels.get(n.level) ?? []
    list.push(n)
    levels.set(n.level, list)
  }
  const sortedLevels = [...levels.keys()].sort((a, b) => a - b)
  const widest = Math.max(...[...levels.values()].map((l) => l.length))
  const totalWidth = widest * (NODE_WIDTH + H_GAP)

  const nodes: Node[] = []
  sortedLevels.forEach((level, row) => {
    const list = levels.get(level)!
    const rowWidth = list.length * (NODE_WIDTH + H_GAP)
    const offset = (totalWidth - rowWidth) / 2
    list.forEach((n, col) => {
      const style = LEVEL_STYLES[Math.min(row, LEVEL_STYLES.length - 1)]
      nodes.push({
        id: n.id,
        data: { label: n.label },
        position: { x: offset + col * (NODE_WIDTH + H_GAP), y: row * V_GAP },
        style: {
          ...style,
          width: NODE_WIDTH,
          borderRadius: 12,
          borderWidth: 1.5,
          padding: '10px 12px',
          boxShadow: '0 1px 2px rgb(0 0 0 / 0.06)',
        },
      })
    })
  })

  const edges: Edge[] = flow.edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e, i) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      label: e.relation,
      type: 'smoothstep',
      animated: i % 3 === 0,
      style: { stroke: 'var(--chart-2)', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--chart-2)' },
      labelStyle: { fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 },
      labelBgStyle: { fill: 'var(--background)' },
      labelBgPadding: [4, 2] as [number, number],
    }))

  return { nodes, edges }
}

export function FlowSection({ analysis }: { analysis: Analysis }) {
  const { nodes, edges } = useMemo(() => buildGraph(analysis.flow), [analysis.flow])

  return (
    <Section
      id="flow"
      eyebrow="04 · Concept Flow"
      title="How the subjects connect"
      description="A word flow chart of the main subjects and the relationships between them. Drag nodes to explore."
    >
      <div className="h-[520px] overflow-hidden rounded-2xl border bg-muted/40">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
          nodesConnectable={false}
          minZoom={0.3}
        >
          <Background gap={20} color="var(--border)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </Section>
  )
}
