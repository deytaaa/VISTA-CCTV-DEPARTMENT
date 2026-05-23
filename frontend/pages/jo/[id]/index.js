import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import ProtectedRoute from '../../../components/ProtectedRoute'
import Layout from '../../../components/layout/Layout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabaseClient'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

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

function statusLabel(status) {
  return (status || 'draft').replace(/_/g, ' ')
}

function statusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'sent':
      return 'bg-sky-100 text-sky-700 ring-sky-200'
    case 'processing':
      return 'bg-indigo-100 text-indigo-700 ring-indigo-200'
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 ring-emerald-200'
    case 'for_approval':
      return 'bg-orange-100 text-orange-800 ring-orange-200'
    case 'approved':
      return 'bg-green-100 text-green-700 ring-green-200'
    case 'rejected':
      return 'bg-red-100 text-red-700 ring-red-200'
    default:
      return 'bg-gray-100 text-gray-700 ring-gray-200'
  }
}

function ActionButton({ children, href, onClick, tone = 'default', disabled = false }) {
  const base = 'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2'
  const tones = {
    default: 'border border-gray-200 bg-white text-black hover:bg-gray-50 focus:ring-gray-200',
    primary: 'bg-taguigRed text-white hover:bg-taguigDark focus:ring-red-200',
    success: 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-200',
  }

  if (href) {
    return (
      <Link href={href} target="_blank" rel="noreferrer" className={`${base} ${tones[tone]}`}>
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

function Table({ columns, rows, emptyMessage }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#FFF0F0] text-gray-700">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="border-t border-gray-100">
              <td className="px-4 py-4 text-gray-500" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows
          )}
        </tbody>
      </table>
    </div>
  )
}

function latestCompletionReport(jobOrder) {
  if (!Array.isArray(jobOrder?.completion_reports) || jobOrder.completion_reports.length === 0) return null

  return [...jobOrder.completion_reports].sort((left, right) => {
    const leftTime = new Date(left?.completed_at || 0).getTime()
    const rightTime = new Date(right?.completed_at || 0).getTime()
    return rightTime - leftTime
  })[0]
}

export default function JobOrderViewPage() {
  const router = useRouter()
  const { session, role, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [jobOrder, setJobOrder] = useState(null)
  const [proofFile, setProofFile] = useState(null)
  const [proofRemarks, setProofRemarks] = useState('')
  const [proofLoading, setProofLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const latestReport = useMemo(() => latestCompletionReport(jobOrder), [jobOrder])
  const proofUrl = useMemo(() => {
    const proofFileName = latestReport?.proof_file
    if (!proofFileName) return ''
    if (proofFileName.startsWith('http')) return proofFileName
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/signed-jo-proofs/${proofFileName}`
  }, [latestReport])

  const isTechnician = role === 'technician'
  const status = (jobOrder?.status || '').toLowerCase()
  const canUploadProof = isTechnician && status === 'processing'
  const canMarkProcessing = isTechnician && status === 'sent'
  const canMarkCompleted = isTechnician && status === 'processing'
  const isProcessingOrBeyond = ['processing', 'completed', 'for_approval', 'approved', 'rejected'].includes(status)

  useEffect(() => {
    let mounted = true

    async function loadJobOrder() {
      if (!router.isReady || !router.query.id || !session?.access_token) return

      setLoading(true)
      setError('')

      try {
        const { data, error: fetchError } = await supabase
          .from('job_orders')
          .select('*, items:job_order_items(*), personnel:job_order_personnel(*), completion_reports(*)')
          .eq('id', router.query.id)
          .single()

        if (fetchError) {
          throw fetchError
        }

        if (mounted) {
          setJobOrder(data || null)
        }
      } catch (loadError) {
        if (mounted) setError(loadError.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadJobOrder()

    return () => {
      mounted = false
    }
  }, [router.isReady, router.query.id, session?.access_token])

  async function refreshJobOrder() {
    if (!router.query.id) return

    const { data, error: fetchError } = await supabase
      .from('job_orders')
      .select('*, items:job_order_items(*), personnel:job_order_personnel(*), completion_reports(*)')
      .eq('id', router.query.id)
      .single()

    if (fetchError) {
      throw fetchError
    }

    setJobOrder(data || null)
  }

  async function markProcessing() {
    if (!session?.access_token || !jobOrder?.id) return

    setActionError('')
    setActionLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/job-orders/${jobOrder.id}/processing`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to mark as processing')
      }

      await refreshJobOrder()
    } catch (requestError) {
      setActionError(requestError.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function uploadProofAndSave() {
    if (!session?.access_token || !jobOrder?.id) return

    if (!proofFile) {
      setActionError('Please choose a proof file first.')
      return
    }

    if (!proofRemarks.trim()) {
      setActionError('Please enter completion remarks.')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(proofFile.type)) {
      setActionError('Only JPG, PNG, and PDF files are allowed.')
      return
    }

    if (proofFile.size > 5 * 1024 * 1024) {
      setActionError('Proof file must be 5MB or smaller.')
      return
    }

    setActionError('')
    setProofLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', proofFile)

      const uploadResponse = await fetch(`${API_BASE_URL}/api/jo/upload-proof`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const uploadPayload = await uploadResponse.json()
      if (!uploadResponse.ok) {
        throw new Error(uploadPayload?.error || 'Failed to upload proof')
      }

      const completionResponse = await fetch(`${API_BASE_URL}/api/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          job_order_id: jobOrder.id,
          proof_file: uploadPayload?.publicURL || uploadPayload?.path,
          remarks: proofRemarks.trim(),
          completed_by: user?.id || null,
          completed_at: new Date().toISOString(),
        }),
      })

      const completionPayload = await completionResponse.json()
      if (!completionResponse.ok) {
        throw new Error(completionPayload?.error || 'Failed to save completion report')
      }

      setProofFile(null)
      setProofRemarks('')
      await refreshJobOrder()
    } catch (saveError) {
      setActionError(saveError.message)
    } finally {
      setProofLoading(false)
    }
  }

  async function markCompleted() {
    if (!session?.access_token || !jobOrder?.id) return

    if (!latestReport?.proof_file) {
      setActionError('Please upload signed JO proof before marking as completed')
      return
    }

    setActionError('')
    setActionLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/job-orders/${jobOrder.id}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to mark as completed')
      }

      await refreshJobOrder()
    } catch (requestError) {
      setActionError(requestError.message)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'technician']}>
      <Layout title="Job Order Details" subtitle={jobOrder?.jo_number || 'Job Order'}>
        <div className="mx-auto max-w-6xl space-y-6">
          {loading ? <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">Loading job order...</div> : null}
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {actionError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div> : null}

          <section className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">JO Number</p>
                <h1 className="mt-2 text-2xl font-black text-black">{jobOrder?.jo_number || 'TBD'}</h1>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
                  <span><strong className="text-black">Date:</strong> {formatDate(jobOrder?.date)}</span>
                  <span><strong className="text-black">Location:</strong> {jobOrder?.location || '—'}</span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(status)}`}>{statusLabel(status)}</span>
                </div>
              </div>

              {isTechnician ? (
                <div className="flex flex-wrap gap-2">
                  <ActionButton href={`/jo/${jobOrder?.id}/pdf`}>Download PDF</ActionButton>
                  {canMarkProcessing ? (
                    <ActionButton tone="primary" onClick={markProcessing} disabled={actionLoading}>
                      Mark as Processing
                    </ActionButton>
                  ) : null}
                  {canUploadProof ? (
                    <ActionButton tone="default" onClick={() => document.getElementById('proof-upload-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                      Upload Proof
                    </ActionButton>
                  ) : null}
                  {canMarkCompleted ? (
                    <ActionButton tone="success" onClick={markCompleted} disabled={actionLoading}>
                      Mark as Completed
                    </ActionButton>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-black">Supplies & Equipment</h2>
            <Table
              columns={['No.', 'Item Name', 'Reference No.', 'Qty']}
              emptyMessage="No supplies or equipment items found."
              rows={(Array.isArray(jobOrder?.items) ? jobOrder.items : []).map((item, index) => (
                <tr key={item.id || index} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-black">{item.item_no || index + 1}</td>
                  <td className="px-4 py-3 text-gray-700">{item.item_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{item.reference_no || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{item.quantity ?? '—'}</td>
                </tr>
              ))}
            />
          </section>

          <section className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-black">Personnel</h2>
            <Table
              columns={['No.', 'Name']}
              emptyMessage="No personnel assigned to this job order."
              rows={(Array.isArray(jobOrder?.personnel) ? jobOrder.personnel : []).map((person, index) => (
                <tr key={person.id || index} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-black">{person.personnel_no || index + 1}</td>
                  <td className="px-4 py-3 text-gray-700">{person.name || '—'}</td>
                </tr>
              ))}
            />
          </section>

          {isProcessingOrBeyond ? (
            <section className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-black">Completion Remarks & Proof</h2>
              {latestReport ? (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-sm font-semibold text-black">Remarks</p>
                  <p className="mt-1 text-sm text-gray-700">{latestReport.remarks || '—'}</p>
                  <p className="mt-4 text-sm font-semibold text-black">Proof</p>
                  {proofUrl ? (
                    <a href={proofUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-taguigRed underline">
                      View uploaded proof
                    </a>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">No proof file available.</p>
                  )}
                  <p className="mt-4 text-xs text-gray-500">Completed at {formatDateTime(latestReport.completed_at)}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">No completion report has been uploaded yet.</p>
              )}

              {canUploadProof ? (
                <div id="proof-upload-section" className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-base font-bold text-black">Upload Proof</h3>
                  <div className="mt-4 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-black">File</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-black outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-black">Completion Remarks</span>
                      <textarea
                        value={proofRemarks}
                        onChange={(e) => setProofRemarks(e.target.value)}
                        rows={4}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        placeholder="Enter completion remarks"
                      />
                    </label>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={uploadProofAndSave}
                        disabled={proofLoading}
                        className="rounded-2xl bg-taguigRed px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {proofLoading ? 'Uploading...' : 'Save Proof'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}