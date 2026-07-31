import { useState, useEffect, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { Plus, Search, X, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { columns, type TableMeta } from './columns'
import { ApplicationForm } from './ApplicationForm'
import { ImportCsvDialog } from './ImportCsvDialog'
import { useApplications } from './useApplications'
import {
  STATUS_VALUES,
  SOURCE_VALUES,
  STATUS_LABELS,
  SOURCE_LABELS,
  type Application,
} from '@/lib/schemas'
import { applicationsToCsv } from '@/lib/csv'
import { isoToday } from '@/lib/format'

function getFiltersFromUrl(): ColumnFiltersState {
  const params = new URLSearchParams(window.location.search)
  const filters: ColumnFiltersState = []
  const status = params.get('status')
  const source = params.get('source')
  const company = params.get('company')
  if (status) filters.push({ id: 'status', value: status })
  if (source) filters.push({ id: 'source', value: source })
  if (company) filters.push({ id: 'company', value: company })
  return filters
}

function syncFiltersToUrl(filters: ColumnFiltersState) {
  const params = new URLSearchParams()
  for (const f of filters) {
    if (f.value) params.set(f.id, String(f.value))
  }
  const search = params.toString()
  history.replaceState(null, '', search ? `?${search}` : window.location.pathname)
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

type Props = {
  onFilteredApplicationsChange: (apps: Application[]) => void
}

export function ApplicationsTable({ onFilteredApplicationsChange }: Props) {
  const {
    applications,
    loading,
    error,
    createApplication,
    importApplications,
    updateApplication,
    updateStatus,
    deleteApplication,
  } = useApplications()

  const [sorting, setSorting] = useState<SortingState>([{ id: 'appliedDate', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => getFiltersFromUrl())

  const [formOpen, setFormOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | undefined>(undefined)
  const [importOpen, setImportOpen] = useState(false)

  const statusFilter = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? ''
  const sourceFilter = (columnFilters.find((f) => f.id === 'source')?.value as string) ?? ''
  const companyFilter = (columnFilters.find((f) => f.id === 'company')?.value as string) ?? ''

  useEffect(() => {
    syncFiltersToUrl(columnFilters)
  }, [columnFilters])

  function setFilter(id: string, value: string | null) {
    setColumnFilters((prev) => {
      const next = prev.filter((f) => f.id !== id)
      if (value) next.push({ id, value })
      return next
    })
  }

  const table = useReactTable({
    data: applications,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: {
      onStatusChange: (id: string, status: string) => {
        updateStatus(id, status)
      },
      onRowClick: (app: Application) => {
        setEditingApp(app)
        setFormOpen(true)
      },
      onDeleteRow: (app: Application) => {
        handleQuickDelete(app)
      },
    } satisfies TableMeta,
  })

  // Pass filtered rows up so charts can reflect active filters
  const filteredRows = table.getFilteredRowModel().rows
  const filteredApplications = useMemo(
    () => filteredRows.map((r) => r.original),
    [filteredRows],
  )
  useEffect(() => {
    onFilteredApplicationsChange(filteredApplications)
  }, [filteredApplications, onFilteredApplicationsChange])

  function openAdd() {
    setEditingApp(undefined)
    setFormOpen(true)
  }

  function handleExport() {
    const csv = applicationsToCsv(filteredApplications)
    downloadCsv(`job-applications-${isoToday()}.csv`, csv)
  }

  async function handleFormSubmit(values: Parameters<typeof createApplication>[0]) {
    if (editingApp) {
      await updateApplication(editingApp.id, values)
    } else {
      await createApplication(values)
    }
  }

  async function handleDelete() {
    if (editingApp) {
      await deleteApplication(editingApp.id)
    }
  }

  async function handleQuickDelete(app: Application) {
    const confirmed = window.confirm(`Delete the application for ${app.role} at ${app.company}?`)
    if (!confirmed) return
    await deleteApplication(app.id)
  }

  const hasFilters = columnFilters.length > 0

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by company..."
            value={companyFilter}
            onChange={(e) => setFilter('company', e.target.value || null)}
            className="pl-8"
          />
        </div>

        <Select
          value={statusFilter || '__all__'}
          onValueChange={(v) => setFilter('status', v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            {STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sourceFilter || '__all__'}
          onValueChange={(v) => setFilter('source', v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All sources</SelectItem>
            {SOURCE_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s] ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setColumnFilters([])}>
            <X className="mr-1 h-4 w-4" />
            Clear filters
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredApplications.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Application
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading && applications.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          Loading applications...
        </div>
      ) : error ? (
        <div className="flex h-40 items-center justify-center text-destructive">
          Error: {error}
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => {
                      const meta = table.options.meta as TableMeta
                      meta.onRowClick(row.original)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-48 text-center"
                  >
                    <div className="flex flex-col items-center gap-3 py-8">
                      <p className="text-lg font-medium text-muted-foreground">
                        {hasFilters ? 'No applications match your filters.' : 'No applications yet.'}
                      </p>
                      {!hasFilters && (
                        <Button onClick={openAdd}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add your first application
                        </Button>
                      )}
                      {hasFilters && (
                        <Button variant="outline" onClick={() => setColumnFilters([])}>
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        {table.getFilteredRowModel().rows.length} of {applications.length} application
        {applications.length !== 1 ? 's' : ''}
        {hasFilters ? ' (filtered)' : ''}
      </div>

      <ApplicationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        application={editingApp}
        onSubmit={handleFormSubmit}
        onDelete={editingApp ? handleDelete : undefined}
      />

      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} onImport={importApplications} />
    </div>
  )
}
