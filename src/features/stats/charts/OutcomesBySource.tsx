import { useRef, useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { computeOutcomesBySource } from '../computeStats'
import { STATUS_CHART_COLORS, STATUS_LABELS, SOURCE_LABELS } from '@/lib/schemas'
import type { Application } from '@/lib/schemas'

type Props = { applications: Application[] }

const OUTCOME_KEYS = ['active', 'ghosted', 'rejected', 'withdrawn', 'accepted'] as const

const OUTCOME_COLORS: Record<string, string> = {
  active: STATUS_CHART_COLORS.applied,
  ghosted: STATUS_CHART_COLORS.ghosted,
  rejected: STATUS_CHART_COLORS.rejected,
  withdrawn: STATUS_CHART_COLORS.withdrawn,
  accepted: STATUS_CHART_COLORS.accepted,
}

const OUTCOME_LABELS: Record<string, string> = {
  active: 'Active',
  ghosted: STATUS_LABELS.ghosted,
  rejected: STATUS_LABELS.rejected,
  withdrawn: STATUS_LABELS.withdrawn,
  accepted: STATUS_LABELS.accepted,
}

export function OutcomesBySource({ applications }: Props) {
  const data = computeOutcomesBySource(applications)
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
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="source"
          tick={{ fontSize: 10 }}
          tickFormatter={(v: string) => SOURCE_LABELS[v] ?? v}
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          labelFormatter={(label) => SOURCE_LABELS[String(label)] ?? String(label)}
          formatter={(value, name) => [value, OUTCOME_LABELS[String(name)] ?? String(name)]}
        />
        <Legend
          formatter={(value: string) => OUTCOME_LABELS[value] ?? value}
          iconSize={10}
          wrapperStyle={{ fontSize: 11 }}
        />
        {OUTCOME_KEYS.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="a"
            fill={OUTCOME_COLORS[key]}
            isAnimationActive={animate}
            animationDuration={600}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
