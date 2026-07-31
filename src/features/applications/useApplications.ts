import { useState, useEffect, useCallback } from 'react'
import type { Application, ApplicationFormValues } from '@/lib/schemas'

type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApplications() {
  const [state, setState] = useState<AsyncState<Application[]>>({
    data: null,
    loading: true,
    error: null,
  })

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch('/api/applications')
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
      const data = (await res.json()) as Application[]
      setState({ data, loading: false, error: null })
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }))
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const createApplication = useCallback(
    async (input: ApplicationFormValues): Promise<Application> => {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error ?? 'Failed to create application')
      }
      const created = (await res.json()) as Application
      await refetch()
      return created
    },
    [refetch],
  )

  const importApplications = useCallback(
    async (apps: ApplicationFormValues[]): Promise<Application[]> => {
      const res = await fetch('/api/applications/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applications: apps }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error ?? 'Failed to import applications')
      }
      const { created } = (await res.json()) as { created: Application[] }
      await refetch()
      return created
    },
    [refetch],
  )

  const updateApplication = useCallback(
    async (id: string, input: Partial<ApplicationFormValues>): Promise<Application> => {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error ?? 'Failed to update application')
      }
      const updated = (await res.json()) as Application
      await refetch()
      return updated
    },
    [refetch],
  )

  const updateStatus = useCallback(
    async (id: string, status: string): Promise<Application> => {
      const res = await fetch(`/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      const updated = (await res.json()) as Application
      // Optimistic update in local state to avoid flicker on inline status change
      setState((s) => ({
        ...s,
        data: s.data?.map((a) => (a.id === id ? updated : a)) ?? null,
      }))
      return updated
    },
    [],
  )

  const deleteApplication = useCallback(
    async (id: string): Promise<void> => {
      const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete application')
      await refetch()
    },
    [refetch],
  )

  return {
    applications: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch,
    createApplication,
    importApplications,
    updateApplication,
    updateStatus,
    deleteApplication,
  }
}
