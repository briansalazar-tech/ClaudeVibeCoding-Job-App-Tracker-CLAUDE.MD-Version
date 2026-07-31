import { computeSummaryStats, type RateWithDenominator } from '../computeStats'
import { formatPercent } from '@/lib/format'
import type { Application } from '@/lib/schemas'

type Props = { applications: Application[]; expanded?: boolean }

function RateTile({
  label,
  rate,
}: {
  label: string
  rate: RateWithDenominator
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold" style={{ color: '#FE7F2D' }}>
        {formatPercent(rate.rate)}
      </p>
      <p className="text-xs text-muted-foreground">
        {rate.numerator} of {rate.denominator}
      </p>
    </div>
  )
}

export function SummaryTiles({ applications, expanded = false }: Props) {
  const stats = computeSummaryStats(applications)

  return (
    <div className="grid grid-cols-2 gap-5 h-full">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Applied</p>
        <p className="text-2xl font-bold" style={{ color: '#FE7F2D' }}>
          {stats.totalApplied}
        </p>
        <p className="text-xs text-muted-foreground">applications</p>
      </div>

      <RateTile label="Response Rate" rate={stats.responseRate} />
      <RateTile label="Interview Rate" rate={stats.interviewRate} />
      <RateTile label="Offer Rate" rate={stats.offerRate} />

      <div className="col-span-2 border-t pt-3 space-y-1.5">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Median Days to Response
        </p>
        <p className="text-2xl font-bold" style={{ color: '#FE7F2D' }}>
          {stats.medianDaysToFirstResponse !== null ? stats.medianDaysToFirstResponse : '—'}
        </p>
        <p className="text-xs text-muted-foreground">days from apply to first update</p>
      </div>

      {expanded && (
        <>
          <RateTile label="Rejection Rate" rate={stats.rejectionRate} />
          <RateTile label="Ghosting Rate" rate={stats.ghostingRate} />

          <div className="col-span-2 border-t pt-3 space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Applications This Month
            </p>
            <p className="text-2xl font-bold" style={{ color: '#FE7F2D' }}>
              {stats.applicationsThisMonth}
            </p>
            <p className="text-xs text-muted-foreground">submitted this calendar month</p>
          </div>
        </>
      )}
    </div>
  )
}
