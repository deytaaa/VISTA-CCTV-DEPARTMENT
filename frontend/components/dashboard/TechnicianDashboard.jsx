import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '../ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import Layout from '../layout/Layout'
import StatCard from './StatCard'
import Link from 'next/link'
import JOStatusBadge from '../jo/JOStatusBadge'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

const summaryCards = [
  { key: 'approved', label: 'Approved', tone: 'approved' },
  { key: 'sent', label: 'Sent', tone: 'warning' },
  { key: 'processing', label: 'Processing', tone: 'info' },
  { key: 'for_approval', label: 'For Approval', tone: 'warning' },
  { key: 'rejected', label: 'Rejected', tone: 'danger' },
]

export default function TechnicianDashboard() {
  const { user, session } = useAuth()
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({ approved: 0, sent: 0, processing: 0, for_approval: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const statusCounts = useMemo(() => counts, [counts])

  function formatDate(value) {
    if (!value) return '—'
    try {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '—'

      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const year = String(date.getFullYear())

      return `${month}/${day}/${year}`
    } catch {
      return '—'
    }
  }

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      if (!user?.id || !session?.access_token) return

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        params.set('page', '1')
        params.set('limit', '100')
        params.set('receiver_id', user.id)
        params.set('status_in', 'approved,sent,processing,for_approval,rejected')

        const response = await fetch(`${API_BASE_URL}/api/job-orders?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load technician dashboard')
        }

        if (!mounted) return

        const list = Array.isArray(payload?.data) ? payload.data : []
        const assignedWorkStatuses = new Set(['sent', 'processing', 'for_approval', 'rejected'])
        const assignedWorkRows = list.filter((row) => assignedWorkStatuses.has((row.status || '').toLowerCase()))
        setRows(assignedWorkRows.slice(0, 5))
        setCounts(
          list.reduce(
            (acc, row) => {
              const status = (row.status || '').toLowerCase()
              if (Object.prototype.hasOwnProperty.call(acc, status)) {
                acc[status] += 1
              }
              return acc
            },
            { approved: 0, sent: 0, processing: 0, for_approval: 0, rejected: 0 }
          )
        )
      } catch (dashboardError) {
        if (!mounted) return
        setError(dashboardError.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadDashboard()

    const channel = supabase
      .channel('technician-dashboard-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' }, () => loadDashboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => loadDashboard())
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [session?.access_token, user?.id])

  return (
    <ProtectedRoute allowedRoles={['technician']}>
      <Layout title="Technician Console" subtitle="Dashboard">
        <div className="mx-auto max-w-6xl space-y-6">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map((card) => (
              <StatCard key={card.key} label={card.label} value={loading ? '…' : statusCounts[card.key] ?? 0} tone={card.tone} />
            ))}
          </section>

          <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-black">Assigned Work</h2>
                <p className="text-sm text-gray-500">Your latest assigned job orders.</p>
              </div>
              <Link href="/jo" className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-black">
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[15%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                </colgroup>
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
                  {loading ? (
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-4 text-gray-500" colSpan={5}>
                        Loading assigned work...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-4 text-gray-500" colSpan={5}>
                        No assigned job orders yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-medium text-black">{row.jo_number || 'TBD'}</td>
                        <td className="px-4 py-3 text-gray-700">{row.location || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 text-gray-700"><JOStatusBadge status={row.status} technicianView /></td>
                        <td className="px-4 py-3 text-gray-700">
                          <Link href={`/jo/${row.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-gray-50">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}