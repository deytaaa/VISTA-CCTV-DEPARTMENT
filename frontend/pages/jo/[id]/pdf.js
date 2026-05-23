import { useEffect, useState } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { useRouter } from 'next/router'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { useAuth } from '../../../context/AuthContext'
import JODocument from '../../../components/jo/JODocument'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

function normalizeJobOrder(payload) {
  if (!payload || typeof payload !== 'object') return null

  const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.job_order_items) ? payload.job_order_items : []
  const personnel = Array.isArray(payload.personnel)
    ? payload.personnel
    : Array.isArray(payload.job_order_personnel)
      ? payload.job_order_personnel
      : []

  return {
    ...payload,
    items,
    personnel,
  }
}

export default function JoPdfPage() {
  const router = useRouter()
  const { session } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const [jobOrder, setJobOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadJobOrder() {
      if (!router.isReady || !router.query.id) return

      if (!session?.access_token) {
        setError('You must be signed in to view the PDF.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${API_BASE_URL}/api/job-orders/${router.query.id}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load job order')
        }

        if (mounted) {
          setJobOrder(normalizeJobOrder(payload?.data))
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadJobOrder()

    return () => {
      mounted = false
    }
  }, [router.isReady, router.query.id, session?.access_token])

  const fileName = jobOrder?.jo_number ? `${jobOrder.jo_number}.pdf` : 'job-order.pdf'

  return (
    <ProtectedRoute>
      <div className="p-6">
        <h1 className="mb-4 text-xl font-bold text-black">JO PDF Preview</h1>
        {loading ? <p className="text-sm text-gray-500">Loading job order...</p> : null}
        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {isClient && jobOrder ? (
          <PDFDownloadLink document={<JODocument jobOrder={jobOrder} />} fileName={fileName}>
            {({ loading: pdfLoading }) =>
              pdfLoading ? (
                <span className="inline-flex rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">Preparing document...</span>
              ) : (
                <button className="rounded-xl bg-taguigRed px-4 py-2 font-semibold text-white">Download PDF</button>
              )
            }
          </PDFDownloadLink>
        ) : null}
      </div>
    </ProtectedRoute>
  )
}
