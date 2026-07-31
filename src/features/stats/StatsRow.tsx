import { useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FunnelChart } from './charts/FunnelChart'
import { ApplicationsOverTime } from './charts/ApplicationsOverTime'
import { OutcomesBySource } from './charts/OutcomesBySource'
import { SummaryTiles } from './charts/SummaryTiles'
import type { Application } from '@/lib/schemas'

type Props = { applications: Application[] }

type CardId = 'funnel' | 'overTime' | 'outcomes' | 'summary'

function ChartCard({
  title,
  expanded,
  onToggleExpand,
  children,
}: {
  title: string
  expanded: boolean
  onToggleExpand: () => void
  children: (expanded: boolean) => React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 shadow-sm',
        expanded ? 'min-h-[42rem]' : 'min-h-96',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onToggleExpand}
          aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
        >
          {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {children(expanded)}
    </div>
  )
}

export function StatsRow({ applications }: Props) {
  // Only one card can be expanded at a time — expanding a card hides the other three so
  // the expanded one can claim 50% of the row's width instead of competing for space.
  const [expandedId, setExpandedId] = useState<CardId | null>(null)

  function toggle(id: CardId) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const showFunnel = expandedId === null || expandedId === 'funnel'
  const showOverTime = expandedId === null || expandedId === 'overTime'
  const showOutcomes = expandedId === null || expandedId === 'outcomes'
  const showSummary = expandedId === null || expandedId === 'summary'

  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-4 sm:grid-cols-2',
        expandedId ? 'lg:grid-cols-2' : 'lg:grid-cols-4',
      )}
    >
      {showFunnel && (
        <ChartCard
          title="Pipeline Funnel"
          expanded={expandedId === 'funnel'}
          onToggleExpand={() => toggle('funnel')}
        >
          {(isExpanded) => <FunnelChart applications={applications} expanded={isExpanded} />}
        </ChartCard>
      )}

      {showOverTime && (
        <ChartCard
          title="Applications Over Time"
          expanded={expandedId === 'overTime'}
          onToggleExpand={() => toggle('overTime')}
        >
          {(isExpanded) => <ApplicationsOverTime applications={applications} expanded={isExpanded} />}
        </ChartCard>
      )}

      {showOutcomes && (
        <ChartCard
          title="Outcomes by Source"
          expanded={expandedId === 'outcomes'}
          onToggleExpand={() => toggle('outcomes')}
        >
          {(isExpanded) => <OutcomesBySource applications={applications} expanded={isExpanded} />}
        </ChartCard>
      )}

      {showSummary && (
        <ChartCard
          title="Summary"
          expanded={expandedId === 'summary'}
          onToggleExpand={() => toggle('summary')}
        >
          {(isExpanded) => <SummaryTiles applications={applications} expanded={isExpanded} />}
        </ChartCard>
      )}
    </div>
  )
}
