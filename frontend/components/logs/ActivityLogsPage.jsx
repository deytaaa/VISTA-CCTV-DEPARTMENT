import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '../ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import Layout from '../layout/Layout'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'technician', label: 'Tech' },
]

function formatTimestamp(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3" />
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-bold text-black">No activity recorded yet.</h3>
      <p className="mt-1 max-w-md text-sm text-gray-500">Actions performed in the system will appear here.</p>
    </div>
  )
}

function RoleBadge({ role }) {
  const value = (role || '').toLowerCase()
  const label =
    value === 'admin'
      ? 'Admin'
      : value === 'technician'
        ? 'Tech'
        : role || '—'
  const tone =
    value === 'admin'
      ? 'bg-red-100 text-red-700 ring-red-200'
      : value === 'technician'
        ? 'bg-sky-100 text-sky-700 ring-sky-200'
        : 'bg-gray-100 text-gray-700 ring-gray-200'
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>{label}</span>
}

export default function ActivityLogsPage({ title, description, allowedRoles = ['admin'] }) {
  const { session } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [refreshTick, setRefreshTick] = useState(0)

  const [searchInput, setSearchInput] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [debouncedSearch, setDebouncedSearch] = useState('')
  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / limit)), [limit, total])
  const startRow = total === 0 ? 0 : (page - 1) * limit + 1
  const endRow = Math.min(page * limit, total)

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, dateFrom, dateTo, roleFilter])

  useEffect(() => {
    let mounted = true

    async function load() {
      if (!session?.access_token) return

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(limit))
        if (debouncedSearch) params.set('q', debouncedSearch)
        if (dateFrom) params.set('date_from', dateFrom)
        if (dateTo) params.set('date_to', dateTo)
        if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter)

        const response = await fetch(`${API_BASE_URL}/api/logs?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load activity logs')
        }

        if (!mounted) return

        setRows(Array.isArray(payload?.data) ? payload.data : [])
        setTotal(Number(payload?.meta?.total || 0))
      } catch (fetchError) {
        if (!mounted) return
        setError(fetchError.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [debouncedSearch, dateFrom, dateTo, limit, page, refreshTick, roleFilter, session?.access_token])

  function clearFilters() {
    setSearchInput('')
    setDateFrom('')
    setDateTo('')
    setRoleFilter('all')
    setPage(1)
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Layout title={title} subtitle="Audit Trail">
        <div className="mx-auto max-w-6xl space-y-5">
          {description ? <p className="text-sm text-gray-600">{description}</p> : null}

          <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-4">
              <label className="block lg:col-span-1">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Search</span>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by user or action..."
                  className="w-full rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Date From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Date To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Role</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-50"
              >
                Clear filters
              </button>
              <div className="text-sm text-gray-500">
                Showing {startRow}-{endRow} of {total}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            {loading ? <p className="text-sm text-gray-500">Loading...</p> : null}
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            {!loading && !error ? (
              rows.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[#FFF0F0] text-gray-700">
                        <tr>
                          <th className="px-4 py-3">Timestamp</th>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Action Performed</th>
                          <th className="px-4 py-3">JO No.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.id} className="border-t border-gray-100 align-top">
                            <td className="px-4 py-4 text-gray-700">{formatTimestamp(row.timestamp)}</td>
                            <td className="px-4 py-4 font-medium text-black">{row.user?.email || row.user?.name || '—'}</td>
                            <td className="px-4 py-4 text-gray-700"><RoleBadge role={row.user?.role} /></td>
                            <td className="px-4 py-4 text-gray-700">{row.action || '—'}</td>
                            <td className="px-4 py-4 text-gray-700">{row.job_order?.jo_number || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                        disabled={page <= 1}
                        className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                        disabled={page >= totalPages}
                        className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )
            ) : null}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
