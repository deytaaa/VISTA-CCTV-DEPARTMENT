import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import ProtectedRoute from '../../../components/ProtectedRoute'
import Layout from '../../../components/layout/Layout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabaseClient'
import JOStatusBadge from '../../../components/jo/JOStatusBadge'

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
  const [proofPreview, setProofPreview] = useState(null)
  const [proofRemarks, setProofRemarks] = useState('')
  const [proofLoading, setProofLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const fileInputRef = useRef(null)
  const cameraVideoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [cameraFacingMode, setCameraFacingMode] = useState('environment')

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
  const rejectionRemarks = jobOrder?.rejection_remarks?.trim()
  const approvalTimestamp = jobOrder?.updated_at ? formatDateTime(jobOrder.updated_at) : '—'

  useEffect(() => {
    return () => {
      if (proofPreview?.url) {
        URL.revokeObjectURL(proofPreview.url)
      }

      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
        cameraStreamRef.current = null
      }
    }
  }, [proofPreview])

  useEffect(() => {
    if (!cameraOpen) return undefined

    let cancelled = false

    async function startCamera() {
      try {
        setCameraError('')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: cameraFacingMode } },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        cameraStreamRef.current = stream
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
        }
      } catch (cameraLoadError) {
        setCameraError('Camera access is not available. Please use Choose File instead.')
      }
    }

    startCamera()

    return () => {
      cancelled = true
    }
  }, [cameraFacingMode, cameraOpen])

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

  function handleFileSelect(event) {
    const file = event.target.files?.[0] || null

    if (proofPreview?.url) {
      URL.revokeObjectURL(proofPreview.url)
    }

    if (!file) {
      setProofFile(null)
      setProofPreview(null)
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setActionError('Only JPG, PNG, and PDF files are allowed.')
      event.target.value = ''
      setProofFile(null)
      setProofPreview(null)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setActionError('File too large. Maximum size is 5MB.')
      event.target.value = ''
      setProofFile(null)
      setProofPreview(null)
      return
    }

    setActionError('')
    setProofFile(file)

    if (file.type === 'application/pdf') {
      setProofPreview({ type: 'pdf', name: file.name })
    } else {
      setProofPreview({ type: 'image', name: file.name, url: URL.createObjectURL(file) })
    }
  }

  function openCameraCapture() {
    setCameraError('')
    setCameraFacingMode('environment')
    setCameraOpen(true)
  }

  function switchCameraFacingMode() {
    const nextFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment'

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null
    }

    setCameraError('')
    setCameraFacingMode(nextFacingMode)
    setCameraOpen(true)
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function closeCameraCapture() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null
    }

    setCameraError('')
    setCameraOpen(false)
  }

  async function capturePhoto() {
    const video = cameraVideoRef.current
    const stream = cameraStreamRef.current

    if (!video || !stream) {
      setCameraError('Camera is not ready yet.')
      return
    }

    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      setCameraError('Unable to capture photo.')
      return
    }

    context.drawImage(video, 0, 0, width, height)

    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Unable to capture photo.')
        return
      }

      const file = new File([blob], `proof-${Date.now()}.jpg`, { type: 'image/jpeg' })

      if (proofPreview?.url) {
        URL.revokeObjectURL(proofPreview.url)
      }

      setActionError('')
      setProofFile(file)
      setProofPreview({ type: 'image', name: file.name, url: URL.createObjectURL(file) })
      closeCameraCapture()
    }, 'image/jpeg', 0.92)
  }

  function retakePhoto() {
    if (proofPreview?.url) {
      URL.revokeObjectURL(proofPreview.url)
    }

    setProofFile(null)
    setProofPreview(null)
    setCameraFacingMode('environment')
    setCameraError('')
    setCameraOpen(true)
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
          previousProofFile: latestReport?.proof_file || null,
          remarks: proofRemarks.trim(),
          completed_at: new Date().toISOString(),
        }),
      })

      const completionPayload = await completionResponse.json()
      if (!completionResponse.ok) {
        throw new Error(completionPayload?.error || 'Failed to save completion report')
      }

      setProofFile(null)
      if (proofPreview?.url) {
        URL.revokeObjectURL(proofPreview.url)
      }
      setProofPreview(null)
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
                  <JOStatusBadge status={status} />
                </div>
                {status === 'rejected' ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <p className="font-semibold">Rejection Reason</p>
                    <p className="mt-1 text-red-600">{rejectionRemarks || 'No rejection remarks provided.'}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionButton href={`/jo/${jobOrder?.id}/pdf`}>Download PDF</ActionButton>
                {isTechnician ? (
                  <>
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
                </>
              ) : null}
              </div>
            </div>
          </section>

          {status === 'approved' ? (
            <section className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-black">Approval Status</h2>
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
                <p className="font-semibold">Approved</p>
                <p className="mt-1">Timestamp: {approvalTimestamp}</p>
              </div>
            </section>
          ) : null}

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
                    <div className="space-y-3">
                      <span className="block text-sm font-semibold text-black">File</span>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={openCameraCapture}
                          className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-gray-50"
                        >
                          📷 Take Photo
                        </button>
                        <button
                          type="button"
                          onClick={openFilePicker}
                          className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-gray-50"
                        >
                          📎 Choose File
                        </button>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.png,.pdf"
                        onChange={handleFileSelect}
                        className="sr-only"
                      />
                      <p className="text-xs text-gray-500">Accepted formats: JPG, PNG, PDF. Maximum file size is 5MB.</p>

                      {proofPreview ? (
                        <div className="rounded-2xl border border-gray-200 bg-white p-4">
                          {proofPreview.type === 'image' ? (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <img src={proofPreview.url} alt="Proof preview" className="h-20 w-20 rounded-xl border border-gray-200 object-cover" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-black">Image Preview</p>
                                <p className="text-sm text-gray-500">{proofPreview.name}</p>
                              </div>
                              <button
                                type="button"
                                onClick={retakePhoto}
                                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-gray-50"
                              >
                                Retake Photo
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 3v4a1 1 0 001 1h4" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-black">PDF Preview</p>
                                <p className="text-sm text-gray-500">{proofPreview.name}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
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

              {cameraOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
                  <div className="w-full max-w-2xl rounded-[24px] bg-white p-5 shadow-2xl">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-black">Take Photo</h3>
                        <p className="text-sm text-gray-500">Point the camera at the proof and capture it.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={switchCameraFacingMode}
                          className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-gray-50"
                        >
                          {cameraFacingMode === 'environment' ? 'Front Camera' : 'Back Camera'}
                        </button>
                        <button
                          type="button"
                          onClick={closeCameraCapture}
                          className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-gray-50"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-black">
                      <video ref={cameraVideoRef} autoPlay playsInline className="h-[360px] w-full object-cover" />
                    </div>

                    {cameraError ? <p className="mt-3 text-sm text-red-600">{cameraError}</p> : null}

                    <div className="mt-4 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={closeCameraCapture}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="rounded-2xl bg-taguigRed px-4 py-2 text-sm font-semibold text-white transition hover:bg-taguigDark"
                      >
                        Capture Photo
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