import { FunnelChart } from './charts/FunnelChart'
import { ApplicationsOverTime } from './charts/ApplicationsOverTime'
import { OutcomesBySource } from './charts/OutcomesBySource'
import { SummaryTiles } from './charts/SummaryTiles'
import type { Application } from '@/lib/schemas'

type Props = { applications: Application[] }

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-96 rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  )
}

export function StatsRow({ applications }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <ChartCard title="Pipeline Funnel">
        <FunnelChart applications={applications} />
      </ChartCard>

      <ChartCard title="Applications Over Time">
        <ApplicationsOverTime applications={applications} />
      </ChartCard>

      <ChartCard title="Outcomes by Source">
        <OutcomesBySource applications={applications} />
      </ChartCard>

      <ChartCard title="Summary">
        <SummaryTiles applications={applications} />
      </ChartCard>
    </div>
  )
}
