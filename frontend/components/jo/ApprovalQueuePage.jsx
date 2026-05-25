import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '../ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import Layout from '../layout/Layout'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-bold text-black">No pending approvals.</h3>
      <p className="mt-1 max-w-md text-sm text-gray-500">Completed Job Orders submitted for approval will appear here.</p>
    </div>
  )
}

function ActionButton({ children, href, onClick, tone = 'default', disabled = false, target, rel }) {
  const base = 'inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2'
  const tones = {
    default: 'border border-gray-200 bg-white text-black hover:bg-gray-50 focus:ring-gray-200',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-200',
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

function resolveProofUrl(row) {
  const proofFile = Array.isArray(row?.completion_reports) ? row.completion_reports[0]?.proof_file : null
  if (!proofFile) return `/jo/${row.id}/pdf`
  if (proofFile.startsWith('http')) return proofFile
  if (!SUPABASE_URL) return `/jo/${row.id}/pdf`
  return `${SUPABASE_URL}/storage/v1/object/public/signed-jo-proofs/${proofFile}`
}

export default function ApprovalQueuePage() {
  const { session, user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [refreshTick, setRefreshTick] = useState(0)

  const [searchInput, setSearchInput] = useState('')
  const [dateFromInput, setDateFromInput] = useState('')
  const [dateToInput, setDateToInput] = useState('')
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
  }, [debouncedSearch, dateFromInput, dateToInput])

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
        params.set('status', 'for_approval')
        if (debouncedSearch) params.set('q', debouncedSearch)
        if (dateFromInput) params.set('date_from', dateFromInput)
        if (dateToInput) params.set('date_to', dateToInput)

        const response = await fetch(`${API_BASE_URL}/api/job-orders?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load approval queue')
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
  }, [dateFromInput, dateToInput, debouncedSearch, limit, page, refreshTick, session?.access_token])

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
        throw new Error(payload?.error || 'Failed to update approval status')
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
    setDateFromInput('')
    setDateToInput('')
    setPage(1)
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Layout title="Approval Queue" subtitle="Job Orders">
        <div className="mx-auto max-w-6xl space-y-5">
          <p className="text-sm text-gray-600">Completed JOs waiting for admin review and approval.</p>

          <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Search JO No. / Location</span>
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by JO No. or Location..."
                    className="w-full rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Date From</span>
                <input
                  type="date"
                  value={dateFromInput}
                  onChange={(e) => setDateFromInput(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Date To</span>
                <input
                  type="date"
                  value={dateToInput}
                  onChange={(e) => setDateToInput(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
                />
              </label>

              <div className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Status</span>
                <div className="flex h-[50px] items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-orange-700">
                  For Approval
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-50"
              >
                Clear Filters
              </button>
              <div className="whitespace-nowrap text-sm text-gray-500">
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
                          <th className="px-4 py-3">Submitted By</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => {
                          const proofUrl = resolveProofUrl(row)
                          return (
                            <tr key={row.id} className="border-t border-gray-100 align-top">
                              <td className="px-4 py-4 font-medium text-black">{row.jo_number || 'TBD'}</td>
                              <td className="px-4 py-4 text-gray-700">{row.location || '—'}</td>
                              <td className="px-4 py-4 text-gray-700">{row.date || '—'}</td>
                              <td className="px-4 py-4 text-gray-700">
                                {row.completion_reports?.[0]?.completed_by_user?.name ||
                                  row.completion_reports?.[0]?.completed_by_user?.email ||
                                  row.sender?.name ||
                                  row.sender?.email ||
                                  row.requestor_name ||
                                  '—'}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <ActionButton href={proofUrl} target="_blank" rel="noreferrer" tone="default">
                                    View Proof
                                  </ActionButton>
                                  <ActionButton
                                    tone="success"
                                    disabled={actionLoadingId === row.id}
                                    onClick={() => updateRowStatus(row.id, 'approve')}
                                  >
                                    Approve
                                  </ActionButton>
                                  <ActionButton
                                    tone="danger"
                                    disabled={actionLoadingId === row.id}
                                    onClick={() => handleReject(row.id)}
                                  >
                                    Reject
                                  </ActionButton>
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