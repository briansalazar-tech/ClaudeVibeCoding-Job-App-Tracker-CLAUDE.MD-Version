import { useRef, useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { computeFunnelData } from '../computeStats'
import { STATUS_CHART_COLORS, STATUS_LABELS } from '@/lib/schemas'
import type { Application } from '@/lib/schemas'

type Props = { applications: Application[] }

export function FunnelChart({ applications }: Props) {
  const data = computeFunnelData(applications)
  const hasData = data.some((d) => d.count > 0)

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
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="stage"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => STATUS_LABELS[v] ?? v}
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          formatter={(value, _name, entry) => {
            const stage = String((entry.payload as Record<string, unknown>)?.['stage'] ?? '')
            return [value, STATUS_LABELS[stage] ?? stage]
          }}
        />
        <Bar dataKey="count" isAnimationActive={animate} animationDuration={600}>
          {data.map((entry) => (
            <Cell
              key={entry.stage}
              fill={STATUS_CHART_COLORS[entry.stage] ?? '#93C5FD'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
