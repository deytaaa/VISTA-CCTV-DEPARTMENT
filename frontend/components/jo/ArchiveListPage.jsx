import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '../ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import Layout from '../layout/Layout'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 8h12M6 12h12M6 16h12" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-bold text-black">No archived records found.</h3>
      <p className="mt-1 max-w-md text-sm text-gray-500">Approved Job Orders will appear here once archived.</p>
    </div>
  )
}

function TableButton({ children, href, tone = 'default', target, rel }) {
  const base = 'inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2'
  const tones = {
    default: 'border border-gray-200 bg-white text-black hover:bg-gray-50 focus:ring-gray-200',
    primary: 'bg-taguigRed text-white hover:bg-taguigDark focus:ring-red-200',
  }

  return (
    <Link href={href} target={target} rel={rel} className={`${base} ${tones[tone]}`}>
      {children}
    </Link>
  )
}

export default function ArchiveListPage({ title, description, allowedRoles = ['admin'] }) {
  const { session } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)

  const [searchInput, setSearchInput] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
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
  }, [debouncedSearch, dateFrom, dateTo])

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
        params.set('status_in', 'approved,archived')
        if (debouncedSearch) params.set('q', debouncedSearch)
        if (dateFrom) params.set('date_from', dateFrom)
        if (dateTo) params.set('date_to', dateTo)

        const response = await fetch(`${API_BASE_URL}/api/job-orders?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load archived records')
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
  }, [debouncedSearch, dateFrom, dateTo, limit, page, session?.access_token])

  function clearFilters() {
    setSearchInput('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Layout title={title} subtitle="Archive">
        <div className="mx-auto max-w-6xl space-y-5">
          {description ? <p className="text-sm text-gray-600">{description}</p> : null}

          <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-4">
              <label className="block lg:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Search by JO No. or Location</span>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by JO No. or location..."
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
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-50"
              >
                Clear Filters
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
                          <th className="px-4 py-3">Date Archived</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.id} className="border-t border-gray-100 align-top">
                            <td className="px-4 py-4 font-medium text-black">{row.jo_number || 'TBD'}</td>
                            <td className="px-4 py-4 text-gray-700">{row.location || '—'}</td>
                            <td className="px-4 py-4 text-gray-700">{formatDate(row.date)}</td>
                            <td className="px-4 py-4 text-gray-700">{formatDateTime(row.updated_at || row.created_at)}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                {/* View Proof: opens the uploaded signed JO proof image/PDF in a new tab when available */}
                                <TableButton href={`/jo/${row.id}`} target="_blank" rel="noreferrer" tone="default">
                                  View
                                </TableButton>

                                {(() => {
                                  const proofFile = Array.isArray(row?.completion_reports) ? row.completion_reports[0]?.proof_file : null
                                  if (!proofFile) return null

                                  // Build public URL for Supabase storage or use absolute URL
                                  const base = proofFile.startsWith('http') ? proofFile : (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/signed-jo-proofs/${proofFile}` : null)
                                  // Append cache-busting timestamp if available
                                  const ts = row?.completion_reports?.[0]?.completed_at || row?.completion_reports?.[0]?.updated_at || ''
                                  const proofUrl = base ? (ts ? `${base}${base.includes('?') ? '&' : '?'}t=${encodeURIComponent(ts)}` : base) : null

                                  return (
                                    <button
                                      type="button"
                                      onClick={() => proofUrl && window.open(proofUrl, '_blank')}
                                      className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold border border-gray-200 bg-white text-black hover:bg-gray-50"
                                    >
                                      View Proof
                                    </button>
                                  )
                                })()}

                                <TableButton href={`/jo/${row.id}/pdf`} target="_blank" rel="noreferrer" tone="default">
                                  Print PDF
                                </TableButton>
                              </div>
                            </td>
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
