import { type ColumnDef, type FilterFn } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  STATUS_VALUES,
  STATUS_COLORS,
  STATUS_LABELS,
  SOURCE_LABELS,
  WORK_MODE_LABELS,
  type Application,
} from '@/lib/schemas'
import { formatDate, formatSalaryRange, formatCurrency } from '@/lib/format'

export type TableMeta = {
  onStatusChange: (id: string, status: string) => void
  onRowClick: (app: Application) => void
}

const multiValueFilter: FilterFn<Application> = (row, columnId, filterValue: string) => {
  if (!filterValue) return true
  const values = filterValue.split(',')
  return values.includes(String(row.getValue(columnId)))
}

export const columns: ColumnDef<Application>[] = [
  {
    accessorKey: 'company',
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Company
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    filterFn: 'includesString',
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Role
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    filterFn: multiValueFilter,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TableMeta
      const status = row.original.status

      return (
        <div onClick={(e) => e.stopPropagation()}>
          <Select
            value={status}
            onValueChange={(value) => meta.onStatusChange(row.original.id, value)}
          >
            <SelectTrigger className="h-7 w-[140px] border-0 p-0 shadow-none focus:ring-0">
              <SelectValue>
                <Badge className={STATUS_COLORS[status] ?? ''}>
                  {STATUS_LABELS[status] ?? status}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  <Badge className={STATUS_COLORS[s] ?? ''}>{STATUS_LABELS[s] ?? s}</Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    },
  },
  {
    accessorKey: 'appliedDate',
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Applied
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => formatDate(row.original.appliedDate),
    sortingFn: 'alphanumeric',
  },
  {
    accessorKey: 'source',
    header: 'Source',
    filterFn: multiValueFilter,
    cell: ({ row }) => SOURCE_LABELS[row.original.source] ?? row.original.source,
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: ({ row }) => row.original.location ?? '—',
  },
  {
    accessorKey: 'workMode',
    header: 'Work Mode',
    cell: ({ row }) =>
      row.original.workMode ? (WORK_MODE_LABELS[row.original.workMode] ?? row.original.workMode) : '—',
  },
  {
    id: 'salary',
    header: 'Salary',
    cell: ({ row }) => formatSalaryRange(row.original.salaryMin, row.original.salaryMax),
  },
  {
    accessorKey: 'salaryRequirement',
    header: 'Salary Req.',
    cell: ({ row }) =>
      row.original.salaryRequirement != null ? formatCurrency(row.original.salaryRequirement) : '—',
  },
  {
    accessorKey: 'coverLetterSubmitted',
    header: 'Cover Letter',
    cell: ({ row }) => (row.original.coverLetterSubmitted ? 'Yes' : 'No'),
  },
  {
    accessorKey: 'lastUpdated',
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Updated
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => formatDate(row.original.lastUpdated),
    sortingFn: 'alphanumeric',
  },
]
