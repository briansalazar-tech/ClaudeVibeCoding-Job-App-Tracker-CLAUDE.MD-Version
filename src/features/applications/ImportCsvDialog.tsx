import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { parseApplicationsCsv, buildCsvTemplate, type ImportedRow } from '@/lib/csv'
import type { ApplicationFormValues } from '@/lib/schemas'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (apps: ApplicationFormValues[]) => Promise<unknown>
}

type ImportSummary = {
  importedCount: number
  flagged: { company: string; role: string; warnings: string[] }[]
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

export function ImportCsvDialog({ open, onOpenChange, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportedRow[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setFileName(null)
    setRows(null)
    setSummary(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSummary(null)
    setFileName(file.name)
    try {
      const text = await file.text()
      const parsed = parseApplicationsCsv(text)
      if (parsed.length === 0) {
        setError('No data rows found in this file.')
        setRows(null)
        return
      }
      setRows(parsed)
    } catch {
      setError('Could not read that file as CSV.')
      setRows(null)
    }
  }

  async function handleImport() {
    if (!rows) return
    setImporting(true)
    setError(null)
    try {
      await onImport(rows.map((r) => r.values))
      setSummary({
        importedCount: rows.length,
        flagged: rows
          .filter((r) => r.warnings.length > 0)
          .map((r) => ({ company: r.values.company, role: r.values.role, warnings: r.warnings })),
      })
      setFileName(null)
      setRows(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const flaggedCount = rows?.filter((r) => r.warnings.length > 0).length ?? 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Applications from CSV</DialogTitle>
          <DialogDescription>
            Rows with missing or invalid data are imported anyway with sensible defaults — fix
            them afterward by editing the application, same as any other row.
          </DialogDescription>
        </DialogHeader>

        <Button
          type="button"
          variant="outline"
          onClick={() => downloadCsv('job-applications-template.csv', buildCsvTemplate())}
        >
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground"
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        {rows && !summary && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            Found <strong>{rows.length}</strong> row{rows.length !== 1 ? 's' : ''} in {fileName}.
            {flaggedCount > 0 && (
              <>
                {' '}
                <strong>{flaggedCount}</strong> {flaggedCount !== 1 ? 'have' : 'has'} missing or
                invalid fields that will be filled with defaults.
              </>
            )}
          </div>
        )}

        {summary && (
          <ScrollArea className="max-h-64 rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">
              Imported {summary.importedCount} application{summary.importedCount !== 1 ? 's' : ''}.
            </p>
            {summary.flagged.length > 0 && (
              <>
                <p className="mb-2 text-sm text-muted-foreground">
                  These rows need a review — open them from the table and fill in the details:
                </p>
                <ul className="space-y-2 text-sm">
                  {summary.flagged.map((f, i) => (
                    <li key={i}>
                      <span className="font-medium">
                        {f.company} — {f.role}
                      </span>
                      <ul className="ml-4 list-disc text-muted-foreground">
                        {f.warnings.map((w, j) => (
                          <li key={j}>{w}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </ScrollArea>
        )}

        <DialogFooter>
          {summary ? (
            <Button onClick={() => handleClose(false)}>Done</Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!rows || importing}>
                {importing ? 'Importing...' : `Import${rows ? ` ${rows.length}` : ''}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
