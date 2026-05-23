import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '../ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import Layout from '../layout/Layout'
import StatCard from './StatCard'
import Link from 'next/link'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

const summaryCards = [
  { key: 'total', label: 'My Total JOs' },
  { key: 'sent', label: 'Sent', tone: 'warning' },
  { key: 'processing', label: 'Processing', tone: 'info' },
  { key: 'completed', label: 'Completed', tone: 'good' },
  { key: 'for_approval', label: 'For Approval', tone: 'warning' },
]

export default function TechnicianDashboard() {
  const { user, session } = useAuth()
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({ total: 0, sent: 0, processing: 0, completed: 0, for_approval: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const statusCounts = useMemo(() => counts, [counts])

  function formatDate(value) {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
    } catch {
      return '—'
    }
  }

  function StatusBadge({ value }) {
    const label = value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '—'
    return (
      <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
        {label}
      </span>
    )
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
        params.set('status_in', 'sent,processing,completed,for_approval')

        const response = await fetch(`${API_BASE_URL}/api/job-orders?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load technician dashboard')
        }

        if (!mounted) return

        const list = Array.isArray(payload?.data) ? payload.data : []
        setRows(list.slice(0, 5))
        setCounts(
          list.reduce(
            (acc, row) => {
              acc.total += 1
              const status = (row.status || '').toLowerCase()
              if (Object.prototype.hasOwnProperty.call(acc, status)) {
                acc[status] += 1
              }
              return acc
            },
            { total: 0, sent: 0, processing: 0, completed: 0, for_approval: 0 }
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
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#FFF0F0] text-gray-700">
                  <tr>
                    <th className="px-4 py-3">JO No.</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-4 text-gray-500" colSpan={4}>
                        Loading assigned work...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-4 text-gray-500" colSpan={4}>
                        No assigned job orders yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-medium text-black">{row.jo_number || 'TBD'}</td>
                        <td className="px-4 py-3 text-gray-700">{row.location || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 text-gray-700"><StatusBadge value={row.status} /></td>
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