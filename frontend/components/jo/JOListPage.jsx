import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '../ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import Layout from '../layout/Layout'
import JOStatusBadge from './JOStatusBadge'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'processing', label: 'Processing' },
  { value: 'rejected', label: 'Rejected' },
]

const TECHNICIAN_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'processing', label: 'Processing' },
  { value: 'for_approval', label: 'For Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-bold text-black">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p>
    </div>
  )
}

function TableButton({ children, href, onClick, tone = 'default', disabled = false, target, rel, compact = false, ariaLabel }) {
  const base = 'inline-flex items-center justify-center rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2'
  const sizeClass = compact ? 'h-8 w-8 text-xs' : 'px-3 py-2 text-xs'
  const tones = {
    default: 'border border-gray-200 bg-white text-black hover:bg-gray-50 focus:ring-gray-200',
    primary: 'bg-taguigRed text-white hover:bg-taguigDark focus:ring-red-200',
    danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-200',
    success: 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-200',
  }

  if (href) {
    return (
      <Link href={href} target={target} rel={rel} aria-label={ariaLabel} className={`${base} ${sizeClass} ${tones[tone]}`}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={`${base} ${sizeClass} ${tones[tone]} disabled:cursor-not-allowed disabled:opacity-60`}>
      {children}
    </button>
  )
}

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

function getLatestCompletionReport(row) {
  if (!Array.isArray(row?.completion_reports) || row.completion_reports.length === 0) return null

  return [...row.completion_reports].sort((left, right) => {
    const leftTime = new Date(left?.completed_at || 0).getTime()
    const rightTime = new Date(right?.completed_at || 0).getTime()
    return rightTime - leftTime
  })[0]
}

export default function JOListPage({
  title,
  description,
  status = null,
  allowedRoles = ['admin', 'technician'],
  viewMode = 'admin',
  receiverId = null,
  statusIn = null,
  showStatusFilter = true,
  emptyTitle = 'No job orders found.',
  emptyDescription = 'Created Job Orders will appear here.',
}) {
  const { session, user } = useAuth()
  const isTechnicianView = viewMode === 'technician'
  const statusOptions = isTechnicianView ? TECHNICIAN_STATUS_OPTIONS : STATUS_OPTIONS
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [refreshTick, setRefreshTick] = useState(0)

  const [statusFilter, setStatusFilter] = useState(status || 'all')
  const [searchInput, setSearchInput] = useState('')
  const [dateFromInput, setDateFromInput] = useState('')
  const [dateToInput, setDateToInput] = useState('')

  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [proofJobOrder, setProofJobOrder] = useState(null)
  const [proofFile, setProofFile] = useState(null)
  const [proofRemarks, setProofRemarks] = useState('')
  const [proofLoading, setProofLoading] = useState(false)
  const [proofError, setProofError] = useState('')
  const [proofToast, setProofToast] = useState({ visible: false, exiting: false })

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / limit)), [limit, total])
  const startRow = total === 0 ? 0 : (page - 1) * limit + 1
  const endRow = Math.min(page * limit, total)

  useEffect(() => {
    if (!proofToast.visible) return

    const exitTimer = setTimeout(() => {
      setProofToast((current) => ({ ...current, exiting: true }))
    }, 4000)

    const resetTimer = setTimeout(() => {
      setProofToast({ visible: false, exiting: false })
    }, 4300)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(resetTimer)
    }
  }, [proofToast.visible])

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, debouncedSearch, dateFromInput, dateToInput])

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

        const effectiveReceiverId = receiverId || (isTechnicianView ? user?.id : null)
        const effectiveStatusIn = statusIn || (isTechnicianView ? 'sent,processing,for_approval,approved,rejected' : 'draft,sent,processing,rejected')

        if (effectiveReceiverId) params.set('receiver_id', effectiveReceiverId)
        if (effectiveStatusIn) params.set('status_in', effectiveStatusIn)
        if (showStatusFilter && statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
        if (debouncedSearch) params.set('q', debouncedSearch)
        if (dateFromInput) params.set('date_from', dateFromInput)
        if (dateToInput) params.set('date_to', dateToInput)

        const response = await fetch(`${API_BASE_URL}/api/job-orders?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        const payload = await response.json()

        // Debug: log response status and payload to browser console
        // eslint-disable-next-line no-console
        console.debug('JOListPage: /api/job-orders', response.status, payload)

        if (!response.ok) {
          // eslint-disable-next-line no-console
          console.error('JOListPage fetch failed', response.status, payload)
          throw new Error(payload?.error || 'Failed to load job orders')
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
  }, [
    debouncedSearch,
    dateFromInput,
    dateToInput,
    isTechnicianView,
    limit,
    page,
    refreshTick,
    receiverId,
    session?.access_token,
    showStatusFilter,
    statusFilter,
    statusIn,
    user?.id,
  ])

  async function technicianRequest(path) {
    if (!session?.access_token) return

    setError(null)
    setActionLoadingId(path.id)

    try {
      const response = await fetch(`${API_BASE_URL}${path.url}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to update job order')
      }

      setRefreshTick((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  async function requestApproval(jobOrderId) {
    if (!session?.access_token) return

    const response = await fetch(`${API_BASE_URL}/api/approval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        job_order_id: jobOrderId,
        action: 'request_approval',
        approved_by: user?.id || null,
      }),
    })

    const payload = await response.json()

    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to send job order for approval')
    }

    return payload
  }

  function handleMarkProcessing(jobOrderId) {
    technicianRequest({ id: jobOrderId, url: `/api/job-orders/${jobOrderId}/processing` })
  }

  function handleMarkCompleted(jobOrderId) {
    technicianRequest({ id: jobOrderId, url: `/api/job-orders/${jobOrderId}/complete` })
  }

  function openProofModal(row) {
    setProofJobOrder(row)
    setProofFile(null)
    setProofRemarks('')
    setProofError('')
  }

  function closeProofModal() {
    if (proofLoading) return
    setProofJobOrder(null)
    setProofFile(null)
    setProofRemarks('')
    setProofError('')
  }

  async function submitProof() {
    if (!proofJobOrder || !session?.access_token || !user?.id) return

    if (!proofFile) {
      setProofError('Please select a proof file.')
      return
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(proofFile.type)) {
      setProofError('Only JPG, PNG, and PDF files are allowed.')
      return
    }

    if (proofFile.size > 5 * 1024 * 1024) {
      setProofError('Proof file must be 5MB or smaller.')
      return
    }

    setProofLoading(true)
    setProofError('')

    try {
      const formData = new FormData()
      formData.append('file', proofFile)
      formData.append('jobOrderId', proofJobOrder.id)

      const uploadResponse = await fetch(`${API_BASE_URL}/api/jo/upload-proof`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const uploadPayload = await uploadResponse.json()
      if (!uploadResponse.ok) {
        throw new Error(uploadPayload?.error || 'Failed to upload proof file')
      }

      const completionResponse = await fetch(`${API_BASE_URL}/api/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          job_order_id: proofJobOrder.id,
          proof_file: uploadPayload?.publicURL || uploadPayload?.path,
          remarks: proofRemarks.trim(),
          completed_at: new Date().toISOString(),
        }),
      })

      const completionPayload = await completionResponse.json()
      if (!completionResponse.ok) {
        throw new Error(completionPayload?.error || 'Failed to save completion proof')
      }

      await requestApproval(proofJobOrder.id)

      setRefreshTick((value) => value + 1)
      setProofToast({ visible: true, exiting: false })
      closeProofModal()
    } catch (proofUploadError) {
      setProofError(proofUploadError.message)
    } finally {
      setProofLoading(false)
    }
  }

  function renderTechnicianActions(row) {
    const status = (row.status || '').toLowerCase()
    const latestCompletion = getLatestCompletionReport(row)
    const hasProof = Boolean(latestCompletion?.proof_file)

    const pdfActions = (
      <>
        <TableButton href={`/jo/${row.id}`} target="_blank" rel="noreferrer" tone="default">
          View
        </TableButton>
        <TableButton href={`/jo/${row.id}/pdf`} target="_blank" rel="noreferrer" tone="default" compact ariaLabel="Download PDF">
          <span className="sr-only">Download PDF</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v10m0 0l4-4m-4 4l-4-4M4 17v2h16v-2" />
          </svg>
        </TableButton>
      </>
    )

    if (status === 'sent') {
      return (
        <div className="flex min-w-max flex-nowrap items-center gap-2">
          {pdfActions}
          <TableButton tone="primary" disabled={actionLoadingId === row.id} onClick={() => handleMarkProcessing(row.id)}>
            Mark as Processing
          </TableButton>
        </div>
      )
    }

    if (status === 'processing') {
      return (
        <div className="flex min-w-max flex-nowrap items-center gap-2">
          {pdfActions}
          <TableButton tone="default" disabled={actionLoadingId === row.id} onClick={() => openProofModal(row)}>
            Upload Proof
          </TableButton>
          <TableButton tone="success" disabled={actionLoadingId === row.id} onClick={() => handleMarkCompleted(row.id)}>
            Mark as Completed
          </TableButton>
          {hasProof ? <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Proof uploaded</span> : null}
        </div>
      )
    }

    if (status === 'rejected') {
      return (
        <div className="flex min-w-max flex-nowrap items-center gap-2">
          {pdfActions}
          <TableButton tone="primary" disabled={proofLoading || actionLoadingId === row.id} onClick={() => openProofModal(row)}>
            Re-upload Proof
          </TableButton>
        </div>
      )
    }

    return (
      <div className="flex min-w-max flex-nowrap items-center gap-2">
        {pdfActions}
      </div>
    )
  }

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
        throw new Error(payload?.error || 'Failed to update job order')
      }

      setRefreshTick((value) => value + 1)
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleSendDraftNow(row) {
    if (!session?.access_token) return

    if (!row.receiver_id) {
      setError('Please assign this draft to a technician before sending.')
      return
    }

    setError(null)
    setActionLoadingId(row.id)

    try {
      const generateResponse = await fetch(`${API_BASE_URL}/api/jo/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const generatePayload = await generateResponse.json()
      if (!generateResponse.ok || !generatePayload?.jo_number) {
        throw new Error(generatePayload?.error || 'Failed to generate JO number')
      }

      const updateResponse = await fetch(`${API_BASE_URL}/api/job-orders/${row.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          jo_number: generatePayload.jo_number,
          status: 'sent',
          updated_at: new Date().toISOString(),
        }),
      })

      const updatePayload = await updateResponse.json()
      if (!updateResponse.ok) {
        throw new Error(updatePayload?.error || 'Failed to send draft job order')
      }

      setRefreshTick((value) => value + 1)
    } catch (sendError) {
      setError(sendError.message)
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
    if (showStatusFilter) setStatusFilter(status || 'all')
    setPage(1)
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Layout title={title} subtitle="Job Orders">
        <div className="mx-auto max-w-6xl space-y-5">
          {proofToast.visible || proofToast.exiting ? (
            <div className="fixed right-4 top-4 z-50 w-[320px] max-w-[calc(100vw-2rem)]">
              <div
                className={`rounded-2xl border-l-4 border-l-[#10B981] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out ${
                  proofToast.exiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
                }`}
              >
                <p className="text-sm font-bold text-black">Proof Uploaded</p>
                <p className="mt-1 text-xs font-medium text-gray-500">Successfully saved.</p>
                <p className="mt-1 text-xs font-medium text-gray-500">You can now mark this JO as completed.</p>
              </div>
            </div>
          ) : null}

          {description ? <p className="text-sm text-gray-600">{description}</p> : null}

          <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row">
              <label className="block lg:flex-[2]">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Search JO No. / Location</span>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by JO No. or Location..."
                  className="w-full rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
                />
              </label>

              <div className={`grid gap-3 lg:flex-[2] ${showStatusFilter ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,2fr)]'}`}>
                <div className="grid grid-cols-2 gap-3">
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
                      className="w-full rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm outline-none focus:border-black"
                    />
                  </label>
                </div>

                {showStatusFilter ? (
                  <label className="block lg:flex-[1]">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Status</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm outline-none focus:border-black"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
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
                <EmptyState title={emptyTitle} description={emptyDescription} />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] table-fixed text-left text-sm">
                      {isTechnicianView ? (
                        <colgroup>
                          <col className="w-[15%]" />
                          <col className="w-[24%]" />
                          <col className="w-[17%]" />
                          <col className="w-[16%]" />
                          <col className="w-[28%]" />
                        </colgroup>
                      ) : (
                        <colgroup>
                          <col className="w-[15%]" />
                          <col className="w-[15%]" />
                          <col className="w-[15%]" />
                          <col className="w-[15%]" />
                          <col className="w-[35%]" />
                        </colgroup>
                      )}
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
                        {rows.map((row) => {
                          const status = (row.status || '').toLowerCase()
                          const isDraft = status === 'draft'
                          const canApprove = status === 'for_approval' || statusFilter === 'for_approval'
                          const technicianActions = isTechnicianView ? renderTechnicianActions(row) : null
                          return (
                            <tr key={row.id} className="border-t border-gray-100 align-top">
                              <td className="px-4 py-4 font-medium text-black">{isDraft ? '—' : row.jo_number || '—'}</td>
                              <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{row.location || '—'}</td>
                              <td className="px-4 py-4 text-gray-700">{formatDate(row.date)}</td>
                              <td className="px-4 py-4 text-gray-700">
                                <JOStatusBadge status={row.status} technicianView={isTechnicianView} />
                              </td>
                              <td className="px-4 py-4">
                                {isTechnicianView ? (
                                  technicianActions
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    <TableButton href={`/jo/${row.id}`} target="_blank" rel="noreferrer" tone="default">
                                      View
                                    </TableButton>
                                    {isDraft ? (
                                      <>
                                        <TableButton href={`/create-jo?draft_id=${row.id}`} tone="default">
                                          Edit
                                        </TableButton>
                                        <TableButton
                                          tone="success"
                                          disabled={actionLoadingId === row.id}
                                          onClick={() => handleSendDraftNow(row)}
                                        >
                                          Send Now
                                        </TableButton>
                                      </>
                                    ) : (
                                      <>
                                        <TableButton href={`/jo/${row.id}/pdf`} target="_blank" rel="noreferrer" tone="default">
                                          Download PDF
                                        </TableButton>
                                        {canApprove ? (
                                          <>
                                            <TableButton
                                              tone="success"
                                              disabled={actionLoadingId === row.id}
                                              onClick={() => updateRowStatus(row.id, 'approve')}
                                            >
                                              Approve
                                            </TableButton>
                                            <TableButton
                                              tone="danger"
                                              disabled={actionLoadingId === row.id}
                                              onClick={() => handleReject(row.id)}
                                            >
                                              Reject
                                            </TableButton>
                                          </>
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                )}
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

          {proofJobOrder ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
              <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-black">{(proofJobOrder.status || '').toLowerCase() === 'rejected' ? 'Re-upload Proof' : 'Upload Proof'}</h3>
                    <p className="text-sm text-gray-500">{proofJobOrder.jo_number || 'Job Order'} - {proofJobOrder.location || 'No location'}</p>
                  </div>
                  <button type="button" onClick={closeProofModal} className="rounded-full border border-gray-200 px-3 py-1 text-sm font-semibold text-black">
                    Close
                  </button>
                </div>

                {proofError ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{proofError}</div> : null}

                <label className="mb-4 block">
                  <span className="mb-2 block text-sm font-semibold text-black">Proof File</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-black outline-none"
                  />
                </label>

                <label className="mb-5 block">
                  <span className="mb-2 block text-sm font-semibold text-black">Completion Remarks</span>
                  <textarea
                    value={proofRemarks}
                    onChange={(e) => setProofRemarks(e.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Add completion remarks"
                  />
                </label>

                <div className="flex items-center justify-end gap-3">
                  <button type="button" onClick={closeProofModal} disabled={proofLoading} className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60">
                    Cancel
                  </button>
                  <button type="button" onClick={submitProof} disabled={proofLoading} className="rounded-2xl bg-taguigRed px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                    {proofLoading ? 'Uploading...' : (proofJobOrder && (proofJobOrder.status || '').toLowerCase() === 'rejected' ? 'Re-upload and Submit' : 'Save Proof')}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
