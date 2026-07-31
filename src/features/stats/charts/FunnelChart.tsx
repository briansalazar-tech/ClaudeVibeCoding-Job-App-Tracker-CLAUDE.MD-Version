import { useRef, useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { computeFunnelData } from '../computeStats'
import { STATUS_CHART_COLORS, STATUS_LABELS } from '@/lib/schemas'
import type { Application } from '@/lib/schemas'

type Props = { applications: Application[]; expanded?: boolean }

export function FunnelChart({ applications, expanded = false }: Props) {
  // Zero-count stages would render as invisible, zero-angle slices — drop them so the
  // legend only lists stages that actually have applications in them.
  const data = computeFunnelData(applications).filter((d) => d.count > 0)
  const hasData = data.length > 0

  const mountedRef = useRef(false)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      setAnimate(true)
    }
  }, [])

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No applications to display
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={expanded ? 460 : 200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="stage"
          cx="50%"
          cy="45%"
          outerRadius={expanded ? 160 : 65}
          isAnimationActive={animate}
          animationDuration={600}
        >
          {data.map((entry) => (
            <Cell key={entry.stage} fill={STATUS_CHART_COLORS[entry.stage] ?? '#93C5FD'} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, _name, entry) => {
            const stage = String((entry.payload as Record<string, unknown>)?.['stage'] ?? '')
            return [value, STATUS_LABELS[stage] ?? stage]
          }}
        />
        <Legend
          formatter={(value: string) => STATUS_LABELS[value] ?? value}
          iconSize={10}
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
