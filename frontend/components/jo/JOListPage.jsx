import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '../ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import Layout from '../layout/Layout'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

function statusLabel(status) {
  return (status || 'draft').replace(/_/g, ' ')
}

export default function JOListPage({ title, description, status = null, allowedRoles = ['admin', 'technician', 'supervisor'] }) {
  const { session } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const queryString = useMemo(() => {
    if (!status) return ''
    return `?status=${encodeURIComponent(status)}`
  }, [status])

  useEffect(() => {
    let mounted = true

    async function load() {
      if (!session?.access_token) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE_URL}/api/job-orders${queryString}`, {
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
  }, [queryString, session?.access_token])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Layout
        title={title}
        subtitle="Job Orders"
        actions={
          <Link href="/dashboard" className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-black">
            Back to Dashboard
          </Link>
        }
      >
        <div className="mx-auto max-w-6xl">
          {description ? <p className="mb-4 text-sm text-gray-600">{description}</p> : null}
          <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            {loading ? <p className="text-sm text-gray-500">Loading...</p> : null}
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            {!loading && !error ? (
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
                    {rows.length === 0 ? (
                      <tr className="border-t border-gray-100">
                        <td className="px-4 py-4 text-gray-500" colSpan={5}>
                          No records found.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-medium text-black">{row.jo_number || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{row.location || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{row.date || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{statusLabel(row.status)}</td>
                          <td className="px-4 py-3">
                            <Link href={`/jo/${row.id}/pdf`} className="text-sm font-semibold text-taguigRed hover:underline">
                              PDF
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
