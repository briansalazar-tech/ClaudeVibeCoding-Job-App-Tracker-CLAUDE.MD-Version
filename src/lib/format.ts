const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatCurrency(value: number): string {
  return currencyFmt.format(value)
}

export function formatSalaryRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min == null && max == null) return '—'
  if (min != null && max != null) return `${formatCurrency(min)} – ${formatCurrency(max)}`
  if (min != null) return `${formatCurrency(min)}+`
  if (max != null) return `Up to ${formatCurrency(max)}`
  return '—'
}

export function formatDate(isoDate: string): string {
  // Append T00:00:00Z to treat the date as UTC midnight, preventing off-by-one from local timezone
  return dateFmt.format(new Date(isoDate + 'T00:00:00Z'))
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay)
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}
