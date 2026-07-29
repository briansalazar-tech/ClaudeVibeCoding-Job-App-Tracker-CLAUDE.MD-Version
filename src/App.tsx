import { useState, useCallback } from 'react'
import { BriefcaseIcon } from 'lucide-react'
import { StatsRow } from './features/stats/StatsRow'
import { ApplicationsTable } from './features/applications/ApplicationsTable'
import type { Application } from './lib/schemas'

export default function App() {
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])

  const handleFilteredApplicationsChange = useCallback((apps: Application[]) => {
    setFilteredApplications(apps)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EAECF0' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#233D4D' }} className="shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BriefcaseIcon className="h-7 w-7 text-white" />
            <div>
              <h1 className="text-xl font-bold text-white">Job Application Tracker</h1>
              <p className="text-xs" style={{ color: '#FE7F2D' }}>
                Track your job search pipeline
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Stats row — receives the same filtered set as the table */}
        <StatsRow applications={filteredApplications} />

        {/* Applications table with filters */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <ApplicationsTable onFilteredApplicationsChange={handleFilteredApplicationsChange} />
        </div>
      </main>
    </div>
  )
}
