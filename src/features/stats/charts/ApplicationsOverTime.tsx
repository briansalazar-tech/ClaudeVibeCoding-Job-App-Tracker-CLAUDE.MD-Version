import { useRef, useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { computeWeeklyApplications } from '../computeStats'
import type { Application } from '@/lib/schemas'

type Props = { applications: Application[]; expanded?: boolean }

export function ApplicationsOverTime({ applications, expanded = false }: Props) {
  const data = computeWeeklyApplications(applications)
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
        No applications in the last 12 weeks
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={expanded ? 460 : 200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="weekLabel"
          tick={{ fontSize: 10 }}
          interval={Math.ceil(data.length / 6) - 1}
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          labelFormatter={(label) => `Week of ${String(label)}`}
          formatter={(value) => [value, 'Applications']}
        />
        <Bar
          dataKey="count"
          fill="#FE7F2D"
          isAnimationActive={animate}
          animationDuration={600}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
