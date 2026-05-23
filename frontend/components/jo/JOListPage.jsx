import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '../ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import Layout from '../layout/Layout'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'for_approval', label: 'For Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
]

function statusLabel(status) {
  return (status || 'draft').replace(/_/g, ' ')
}

function statusMeta(status) {
  switch ((status || '').toLowerCase()) {
    case 'draft':
      return { label: 'Draft', className: 'bg-gray-100 text-gray-700 ring-gray-200' }
    case 'sent':
      return { label: 'Sent', className: 'bg-sky-100 text-sky-700 ring-sky-200' }
    case 'pending':
      return { label: 'Pending', className: 'bg-amber-100 text-amber-800 ring-amber-200' }
    case 'processing':
      return { label: 'Processing', className: 'bg-indigo-100 text-indigo-700 ring-indigo-200' }
    case 'completed':
      return { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 ring-emerald-200' }
    case 'for_approval':
      return { label: 'For Approval', className: 'bg-orange-100 text-orange-800 ring-orange-200' }
    case 'approved':
      return { label: 'Approved', className: 'bg-green-100 text-green-700 ring-green-200' }
    case 'rejected':
      return { label: 'Rejected', className: 'bg-red-100 text-red-700 ring-red-200' }
    case 'archived':
      return { label: 'Archived', className: 'bg-slate-100 text-slate-700 ring-slate-200' }
    default:
      return { label: statusLabel(status), className: 'bg-gray-100 text-gray-700 ring-gray-200' }
  }
}

function StatusBadge({ status }) {
  const meta = statusMeta(status)
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${meta.className}`}>{meta.label}</span>
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-bold text-black">No job orders found</h3>
      <p className="mt-1 max-w-md text-sm text-gray-500">Try widening your search, changing the status filter, or clearing the date/location filters.</p>
    </div>
  )
}

function TableButton({ children, href, onClick, tone = 'default', disabled = false, target, rel }) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2'
  const tones = {
    default: 'border border-gray-200 bg-white text-black hover:bg-gray-50 focus:ring-gray-200',
    primary: 'bg-taguigRed text-white hover:bg-taguigDark focus:ring-red-200',
    danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-200',
    success: 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-200',
  }

  if (href) {
    return (
      <Link href={href} target={target} rel={rel} className={`${base} ${tones[tone]}`}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${tones[tone]} disabled:cursor-not-allowed disabled:opacity-60`}>
      {children}
    </button>
  )
}

export default function JOListPage({ title, description, status = null, allowedRoles = ['admin', 'technician'] }) {
  const { session, user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [refreshTick, setRefreshTick] = useState(0)

  const [statusFilter, setStatusFilter] = useState(status || 'all')
  const [searchInput, setSearchInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [dateInput, setDateInput] = useState('')

  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [debouncedLocation, setDebouncedLocation] = useState('')

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / limit)), [limit, total])
  const startRow = total === 0 ? 0 : (page - 1) * limit + 1
  const endRow = Math.min(page * limit, total)

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedLocation(locationInput.trim()), 300)
    return () => clearTimeout(handle)
  }, [locationInput])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, debouncedSearch, debouncedLocation, dateInput])

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

        if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
        if (debouncedSearch) params.set('q', debouncedSearch)
        if (debouncedLocation) params.set('location', debouncedLocation)
        if (dateInput) params.set('date', dateInput)

        const response = await fetch(`${API_BASE_URL}/api/job-orders?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load job orders')
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
  }, [debouncedLocation, debouncedSearch, dateInput, limit, page, refreshTick, session?.access_token, statusFilter])

  async function updateRowStatus(jobOrderId, action, remarks = '') {
    if (!session?.access_token) return

    setActionLoadingId(jobOrderId)

    try {
      const response = await fetch(`${API_BASE_URL}/api/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          job_order_id: jobOrderId,
          action,
          remarks,
          approved_by: user?.id || null,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to update job order')
      }

      setRefreshTick((value) => value + 1)
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  function handleReject(jobOrderId) {
    const remarks = window.prompt('Enter rejection remarks')
    if (remarks === null) return
    const trimmed = remarks.trim()
    if (!trimmed) {
      setError('Rejection remarks are required.')
      return
    }
    updateRowStatus(jobOrderId, 'reject', trimmed)
  }

  function clearFilters() {
    setSearchInput('')
    setLocationInput('')
    setDateInput('')
    setStatusFilter(status || 'all')
    setPage(1)
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Layout title={title} subtitle="Job Orders">
        <div className="mx-auto max-w-6xl space-y-5">
          {description ? <p className="text-sm text-gray-600">{description}</p> : null}

          <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Search JO No. / Location</span>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by JO number or location"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Location</span>
                <input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Filter by location"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Date</span>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  {STATUS_OPTIONS.map((option) => (
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
                          <th className="px-4 py-3">JO No.</th>
                          <th className="px-4 py-3">Location</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => {
                          const canApprove = (row.status || '').toLowerCase() === 'for_approval' || statusFilter === 'for_approval'
                          return (
                            <tr key={row.id} className="border-t border-gray-100 align-top">
                              <td className="px-4 py-4 font-medium text-black">{row.jo_number || 'TBD'}</td>
                              <td className="px-4 py-4 text-gray-700">{row.location || '—'}</td>
                              <td className="px-4 py-4 text-gray-700">{row.date || '—'}</td>
                              <td className="px-4 py-4 text-gray-700">
                                <div className="space-y-2">
                                  <StatusBadge status={row.status} />
                                  {row.rejection_remarks ? <p className="max-w-xs text-xs text-red-600">Remarks: {row.rejection_remarks}</p> : null}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <TableButton href={`/jo/${row.id}/pdf`} target="_blank" rel="noreferrer" tone="default">
                                    View
                                  </TableButton>
                                  <TableButton href={`/jo/${row.id}/pdf`} target="_blank" rel="noreferrer" tone="default">
                                    Download PDF
                                  </TableButton>
                                  {canApprove ? (
                                    <>
                                      <TableButton
                                        tone="success"
                                        disabled={actionLoadingId === row.id}
                                        onClick={() => updateRowStatus(row.id, 'approve')}
                                      >
                                        Approve
                                      </TableButton>
                                      <TableButton
                                        tone="danger"
                                        disabled={actionLoadingId === row.id}
                                        onClick={() => handleReject(row.id)}
                                      >
                                        Reject
                                      </TableButton>
                                    </>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
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
