import Link from 'next/link'
import ProtectedRoute from '../ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { useEffect, useMemo, useState } from 'react'
import StatCard from './StatCard'
import Layout from '../layout/Layout'

const summaryCards = [
  { key: 'total', label: 'Total JOs' },
  { key: 'pending', label: 'Pending', tone: 'warning' },
  { key: 'processing', label: 'Processing', tone: 'info' },
  { key: 'for_approval', label: 'For Approval', tone: 'warning' },
  { key: 'rejected', label: 'Rejected', tone: 'danger' },
  { key: 'archived', label: 'Archived', tone: 'neutral' },
]

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function AdminDashboard() {
  const { user, role } = useAuth()
  const canCreateJo = role === 'admin' || role === 'dispatcher'
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const statusCounts = useMemo(() => {
    return summaryCards.reduce((acc, card) => {
      acc[card.key] = counts[card.key] ?? 0
      return acc
    }, {})
  }, [counts])

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      if (!user?.id) return

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      if (!token) return

      setLoading(true)
      setError(null)

      try {
        const [jobOrdersResponse, logsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/job-orders`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/logs?limit=5`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        const jobOrdersPayload = await jobOrdersResponse.json()
        const logsPayload = await logsResponse.json()

        if (!jobOrdersResponse.ok) {
          throw new Error(jobOrdersPayload?.error || 'Failed to load dashboard data')
        }

        if (!mounted) return

        const list = Array.isArray(jobOrdersPayload?.data) ? jobOrdersPayload.data : []
        setRows(Array.isArray(logsPayload?.data) ? logsPayload.data : [])
        setCounts(
          list.reduce(
            (acc, row) => {
              acc.total += 1
              const key = (row.status || 'draft').toLowerCase()
              if (Object.prototype.hasOwnProperty.call(acc, key)) {
                acc[key] = (acc[key] || 0) + 1
              }
              return acc
            },
            {
              total: 0,
              pending: 0,
              processing: 0,
              for_approval: 0,
              rejected: 0,
              archived: 0,
            }
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
      .channel('dashboard-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' }, () => {
        loadDashboard()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        loadDashboard()
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <ProtectedRoute>
      <Layout
        title="VISTA CCTV — Admin Console"
        subtitle="Dashboard"
        actions={
          <div className="flex items-center gap-3">
            <button onClick={handleSignOut} className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-black">
              Sign out
            </button>
          </div>
        }
      >
        <div className="mx-auto max-w-6xl">
          {error ? <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {summaryCards.map((card) => (
              <StatCard key={card.key} label={card.label} value={loading ? '…' : statusCounts[card.key] ?? 0} tone={card.tone} />
            ))}
          </section>

          <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-black">Recent JO Activity</h2>
                <p className="text-sm text-gray-500">Recent dispatches and status changes</p>
              </div>
              <Link href="/logs" className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-black">
                View Logs
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#FFF0F0] text-gray-700">
                  <tr>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">JO</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-4 text-gray-500" colSpan={3}>
                        Loading recent activity...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-4 text-gray-500" colSpan={3}>
                        No recent activity.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-medium text-black">{row.action}</td>
                        <td className="px-4 py-3 text-gray-700">{row.job_order_id || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{row.timestamp || '—'}</td>
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
