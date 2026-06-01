import Link from 'next/link'
import ProtectedRoute from '../ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { useEffect, useMemo, useState } from 'react'
import StatCard from './StatCard'
import Layout from '../layout/Layout'

const summaryCards = [
  { key: 'total', label: 'Total JOs' },
  { key: 'processing', label: 'Processing', tone: 'info' },
  { key: 'for_approval', label: 'For Approval', tone: 'warning' },
  { key: 'rejected', label: 'Rejected', tone: 'danger' },
]

function formatActivityTimestamp(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(',', '')
}

function formatActivityAction(action) {
  const normalized = String(action || '').trim().toLowerCase()
  const mapping = {
    job_order_created: 'Job Order created',
    status_changed_to_processing: 'Marked as Processing',
    proof_uploaded: 'Proof uploaded by technician',
    submitted_for_approval: 'Submitted for approval',
    job_order_approved: 'Approved by admin',
    job_order_rejected: 'Rejected by admin',
    proof_reuploaded: 'Proof re-submitted',
    'marked as processing': 'Marked as Processing',
    'marked as completed': 'Submitted for approval',
    'proof re-uploaded and submitted for approval': 'Proof re-submitted',
    'job order approved and archived': 'Approved by admin',
    'job order rejected': 'Rejected by admin',
  }

  return mapping[normalized] || action || 'Activity update'
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function AdminDashboard() {
  const { user, role } = useAuth()

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

        // Debug: surface response status and payload for troubleshooting
        // Visible in browser devtools console when dashboard loads
        // eslint-disable-next-line no-console
        console.debug('AdminDashboard: /api/job-orders', jobOrdersResponse.status, jobOrdersPayload)
        // eslint-disable-next-line no-console
        console.debug('AdminDashboard: /api/logs', logsResponse.status, logsPayload)

        if (jobOrdersResponse.status === 401 || logsResponse.status === 401) {
          if (typeof window !== 'undefined') window.location.href = '/login'
          return
        }

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
              processing: 0,
              for_approval: 0,
              rejected: 0,
            }
          )
        )
      } catch (dashboardError) {
        if (!mounted) return
        // eslint-disable-next-line no-console
        console.error('Dashboard load error', dashboardError)
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
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('userRole')
      window.localStorage.removeItem('userData')
      window.sessionStorage.clear()
    }
    window.location.href = '/login'
  }

  return (
    <ProtectedRoute>
      <Layout title="VISTA CCTV — Admin Console" subtitle="Dashboard">
        <div className="mx-auto max-w-6xl">
          {error ? <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                        <td className="px-4 py-3 font-medium text-black">{formatActivityAction(row.action)}</td>
                        <td className="px-4 py-3 text-gray-700">{row.job_order?.jo_number || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{formatActivityTimestamp(row.timestamp)}</td>
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
